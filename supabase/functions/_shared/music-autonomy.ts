
const obj=(v:any):Record<string,any>=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const str=(v:any,n=300)=>typeof v==="string"?v.trim().slice(0,n):"";
export const normalized=(v:any)=>str(v).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
export function musicIntent(v:any) {
  const p=obj(v);
  if(!str(p.artist,100)||!str(p.track,150)||!str(p.reason,500))return null;
  return {artist:str(p.artist,100),track:str(p.track,150),reason:str(p.reason,500),
    reaction:str(p.reaction,400),save:p.save===true,share:p.share===true&&!!str(p.share_reason,400),
    share_reason:str(p.share_reason,400),affinity:Number.isInteger(p.affinity)?Math.max(0,Math.min(100,p.affinity)):50};
}
async function idFor(value:string) {
  const b=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))).slice(0,16);
  b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;
  const h=Array.from(b,n=>n.toString(16).padStart(2,"0")).join("");
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join("-");
}
export function findVerifiedTrack(results:any[],intent:any) {
  return results.find(t=>t.kind==="song"&&Number.isSafeInteger(t.trackId)&&t.trackId>0
    &&normalized(t.trackName)===normalized(intent.track)&&normalized(t.artistName)===normalized(intent.artist))??null;
}
export async function verifyMusic(intent:any) {
  const query=new URLSearchParams({term:intent.artist+" "+intent.track,entity:"song",media:"music",country:"US",limit:"15"});
  const response=await fetch("https://itunes.apple.com/search?"+query,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error("catalog_"+response.status);
  const data=await response.json();
  const found=findVerifiedTrack(Array.isArray(data.results)?data.results:[],intent);
  if(!found)return null;
  return {title:found.trackName,artist:found.artistName,album:found.collectionName??null,
    catalogId:String(found.trackId),catalogUrl:typeof found.trackViewUrl==="string"&&/^https:\/\/(music|itunes)\.apple\.com\//.test(found.trackViewUrl)?found.trackViewUrl:null,
    durationMs:Math.max(0,Math.round(Number(found.trackTimeMillis)||0)),
    spotifyUrl:"https://open.spotify.com/search/"+encodeURIComponent(found.artistName+" "+found.trackName)};
}
export async function applyMusicAutonomy(db:any,uid:string,actionId:any) {
  const {data:a,error:ae}=await db.from("character_actions").select("*").eq("user_id",uid).eq("id",actionId).single();
  if(ae)throw ae;
  if(a.status!=="completed"||a.source_type!=="dominic_life_loop"||!a.lived_event_id)return;
  const intent=musicIntent(a.payload?.music_intent);
  if(!intent||obj(a.result).music_autonomy?.done===true)return;
  const old=obj(a.result).music_autonomy;
  if(old?.status==="running"&&Date.now()-Date.parse(old.started_at)<120000)return;
  const {data:claimed,error:ce}=await db.from("character_actions")
    .update({result:{...obj(a.result),music_autonomy:{status:"running",started_at:new Date().toISOString()}}})
    .eq("user_id",uid).eq("id",a.id).eq("updated_at",a.updated_at).select("id");
  if(ce)throw ce;if(!claimed?.length)return;
  async function finish(state:any) {
    const {data:current,error}=await db.from("character_actions").select("result").eq("user_id",uid).eq("id",a.id).single();
    if(error)throw error;
    const {error:ue}=await db.from("character_actions").update({result:{...obj(current.result),music_autonomy:state}})
      .eq("user_id",uid).eq("id",a.id);
    if(ue)throw ue;
  }
  try {
    const track=await verifyMusic(intent);
    if(!track){await finish({done:true,status:"unverified_track"});return;}
    const at=a.completed_at??new Date().toISOString();
    const key=normalized(track.artist)+":"+normalized(track.title);
    let songId:string|null=null;
    const {data:songs,error:se}=await db.from("diario_items").select("id,title,status,data").eq("user_id",uid).eq("kind","song").eq("owner","dominic");
    if(se)throw se;
    const existing=(songs??[]).find((s:any)=>normalized(s.title)===normalized(track.title)&&normalized(s.data?.artist)===normalized(track.artist));
    // Respect a deleted/archived song; never resurrect it automatically.
    if(existing)songId=existing.status==="active"?existing.id:null;
    else if(intent.save) {
      songId=await idFor(uid+":dominic:music:"+key);
      const {error}=await db.from("diario_items").upsert({
        id:songId,user_id:uid,kind:"song",owner:"dominic",status:"active",title:track.title,
        body:intent.reaction||intent.reason,event_at:at,planned_for:null,
        data:{artist:track.artist,album:track.album,spotifyId:null,spotifyUri:null,spotifyUrl:track.spotifyUrl,
          coverUrl:null,durationMs:track.durationMs,favorite:false,autonomous:true,
          source:"dominic_music_autonomy",catalog_provider:"itunes",catalog_id:track.catalogId,catalog_url:track.catalogUrl,
          life_action_id:a.id,lived_event_id:a.lived_event_id,saved_reason:intent.reason}
      },{onConflict:"id",ignoreDuplicates:true});
      if(error)throw error;
    }
    const {data:prior,error:priorError}=await db.from("character_music_events").select("id").eq("user_id",uid)
      .eq("source_type","dominic_music_autonomy").eq("source_context_id",String(a.id)).limit(1);
    if(priorError)throw priorError;
    if(!prior?.length) {
      const {error}=await db.from("character_music_events").insert({
        user_id:uid,character_name:"dominic",event_type:"character_choice",
        artist_name:track.artist,track_name:track.title,album_name:track.album,occurred_at:at,
        source_type:"dominic_music_autonomy",source_context_type:"character_action",source_context_id:String(a.id),
        reason:intent.reason,significance:intent.affinity,
        metadata:{fictional_listening:true,saved:intent.save&&!!songId,song_item_id:songId,
          reaction:intent.reaction,lived_event_id:a.lived_event_id,catalog_id:track.catalogId}
      });
      if(error)throw error;
    }
    const {error:affError}=await db.from("character_music_affinity").upsert({
      user_id:uid,character_name:"dominic",entity_type:"track",entity_key:key,
      artist_name:track.artist,track_name:track.title,affinity_score:intent.affinity,
      last_seen_at:at,metadata:{source:"dominic_music_autonomy",reaction:intent.reaction,action_id:a.id}
    },{onConflict:"user_id,character_name,entity_type,entity_key"});
    if(affError)throw affError;
    if(intent.share) {
      const eventId=await idFor(uid+":music-share:"+a.id);
      const {error}=await db.from("proactive_events").upsert({
        id:eventId,user_id:uid,event_type:"life_consequence",status:"pending",scheduled_for:new Date().toISOString(),
        context:{source:"dominic_music_autonomy",character_action_id:a.id,reason:intent.share_reason,
          music:{title:track.title,artist:track.artist,url:existing?.data?.spotifyUrl||track.spotifyUrl,
            song_item_id:songId,reaction:intent.reaction,saved_by_dominic:intent.save&&!!songId}}
      },{onConflict:"id",ignoreDuplicates:true});
      if(error)throw error;
    }
    // Let the normal consequence linker connect the newly saved original song.
    if(songId){
      const {data:latest,error:le}=await db.from("character_actions").select("payload,result").eq("user_id",uid).eq("id",a.id).single();
      if(le)throw le;
      const payload=obj(latest.payload),consequences=obj(payload.life_consequences);
      const related=Array.from(new Set([songId,...(Array.isArray(consequences.related_item_ids)?consequences.related_item_ids:[])])).slice(0,4);
      const result=obj(latest.result), completed=obj(result.life_consequences);
      if(completed.version===1){
        for(const id of completed.created_item_ids??[]){
          const {error:linkError}=await db.from("diario_links").upsert({
            user_id:uid,source_item_id:id,target_item_id:songId,relation:"contains",
            data:{source:"dominic_music_autonomy",lived_event_id:a.lived_event_id}
          },{onConflict:"user_id,source_item_id,target_item_id,relation",ignoreDuplicates:true});
          if(linkError)throw linkError;
        }
        result.life_consequences={...completed,related_item_ids:related};
      }
      const {error}=await db.from("character_actions").update({result,payload:{...payload,life_consequences:{...consequences,related_item_ids:related}}})
        .eq("user_id",uid).eq("id",a.id);
      if(error)throw error;
    }
    await finish({done:true,status:"complete",song_item_id:songId,saved:intent.save&&!!songId,share_opportunity:intent.share,
      title:track.title,artist:track.artist,completed_at:new Date().toISOString()});
  }catch(error){
    await finish({done:false,status:"failed",error:error instanceof Error?error.message:"music_failed"});
    throw error;
  }
}
