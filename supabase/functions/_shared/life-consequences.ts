
type DB = any;
const object=(v:any):Record<string,any>=>v&&typeof v==="object"&&!Array.isArray(v)?v:{};
const textValue=(v:any,max=600)=>typeof v==="string"?v.trim().slice(0,max):"";

export function normalizeConsequences(raw:any,catalog:any[]) {
  const c=object(raw);
  const byId=new Map(catalog.map((item:any)=>[item.id,item]));
  const refs=Array.from(new Set(Array.isArray(c.related_item_ids)?c.related_item_ids:[]))
    .filter((id:any)=>typeof id==="string"&&["song","place"].includes(byId.get(id)?.kind)
      &&["dominic","shared"].includes(byId.get(id)?.owner)&&byId.get(id)?.status==="active").slice(0,4);
  const memory=object(c.memory), idea=object(c.date_idea);
  const significant=Number.isInteger(memory.significance)&&memory.significance>=8&&memory.significance<=10;
  // At most one new surfaced object per lived event. Empty is normal.
  return {
    related_item_ids:refs,
    memory:significant&&textValue(memory.title,100)&&textValue(memory.reason)&&textValue(memory.body)
      ? {title:textValue(memory.title,100),body:textValue(memory.body),reason:textValue(memory.reason),significance:memory.significance}:null,
    date_idea:!significant&&textValue(idea.title,100)&&textValue(idea.reason)&&textValue(idea.note)
      ? {title:textValue(idea.title,100),note:textValue(idea.note),reason:textValue(idea.reason),
         place_item_id:refs.includes(idea.place_item_id)&&byId.get(idea.place_item_id)?.kind==="place"?idea.place_item_id:null}:null
  };
}

async function stableId(key:string) {
  const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(key))).slice(0,16);
  bytes[6]=(bytes[6]&15)|80; bytes[8]=(bytes[8]&63)|128;
  const h=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join("-");
}

async function connect(db:DB,uid:string,source:string,targets:string[],eventId:string) {
  const rows=Array.from(new Set(targets)).filter(id=>id!==source).map(id=>({
    user_id:uid,source_item_id:source,target_item_id:id,relation:"contains",
    data:{source:"dominic_life_loop",lived_event_id:eventId}
  }));
  if(!rows.length)return;
  const {error}=await db.from("diario_links").upsert(rows,{
    onConflict:"user_id,source_item_id,target_item_id,relation",ignoreDuplicates:true
  });
  if(error)throw error;
}

export async function applyLifeConsequences(db:DB,uid:string,actionId:number|string) {
  const {data:action,error:ae}=await db.from("character_actions").select("*").eq("user_id",uid).eq("id",actionId).single();
  if(ae)throw ae;
  if(action.status!=="completed"||action.source_type!=="dominic_life_loop"||!action.lived_event_id)return;
  if(object(action.result).life_consequences?.version===1)return;
  const raw=object(action.payload).life_consequences;
  if(!raw)return; // Older events are not retroactively turned into new objects.
  const {data:event,error:ee}=await db.from("lived_events").select("*").eq("user_id",uid).eq("id",action.lived_event_id).single();
  if(ee)throw ee;
  const wanted=Array.isArray(raw.related_item_ids)?raw.related_item_ids.filter((id:any)=>typeof id==="string").slice(0,4):[];
  const {data:items,error:ie}=wanted.length?await db.from("diario_items").select("*").eq("user_id",uid).eq("status","active").in("id",wanted):{data:[],error:null};
  if(ie)throw ie;
  const plan=normalizeConsequences(raw,items??[]);
  const ids=plan.related_item_ids as string[];
  const at=event.occurred_at;
  const basis={source:"dominic_life_loop",life_action_id:action.id,lived_event_id:event.id,actor:"dominic"};
  const createdIds:string[]=[];
  const kind=plan.memory?"story_memory":plan.date_idea?"date":null;
  if(kind) {
    const proposal=plan.memory??plan.date_idea!;
    const id=await stableId(uid+":"+event.id+":"+kind);
    const {data:prior,error:priorError}=await db.from("diario_items").select("id,title,data").eq("user_id",uid)
      .eq("kind",kind).eq("status","active").order("created_at",{ascending:false}).limit(80);
    if(priorError)throw priorError;
    const sameEvent=(prior??[]).find((item:any)=>item.id===id);
    // Similar moments are left alone; never merge unrelated events or overwrite user edits.
    const duplicate=(prior??[]).some((item:any)=>item.id!==id&&textValue(item.title).toLowerCase()===proposal.title.toLowerCase());
    if(sameEvent||!duplicate) {
      const place=(items??[]).find((item:any)=>item.id===plan.date_idea?.place_item_id);
      const {error:saveError}=await db.from("diario_items").upsert({
        id,user_id:uid,kind,owner:"dominic",status:"active",title:proposal.title,
        body:plan.memory?plan.memory.body:plan.date_idea!.note,
        event_at:kind==="story_memory"?at:null,planned_for:null,
        data:kind==="story_memory"
          ? {...basis,significance:plan.memory!.significance,selection_reason:plan.memory!.reason}
          : {...basis,flow_state:"idea",proposed_by:"dominic",requires_user_action:true,
             place:place?.title??null,place_item_id:place?.id??null,time_known:false,time_hint:null,
             selection_reason:plan.date_idea!.reason}
      },{onConflict:"id",ignoreDuplicates:true});
      if(saveError)throw saveError;
      await connect(db,uid,id,ids,event.id);
      createdIds.push(id);
      // A late retry also attaches any photo already created for this action.
      const {data:photos,error:photoError}=await db.from("diario_items").select("id").eq("user_id",uid)
        .eq("kind","photo").eq("status","active").contains("data",{life_action_id:action.id}).limit(12);
      if(photoError)throw photoError;
      await connect(db,uid,id,(photos??[]).map((p:any)=>p.id),event.id);
    }
  }
  // The original objects keep their owner, body, status and shared visit state.
  // A solo connection must never turn Mine into Ours or mark a shared place visited.
  for(const item of items??[]) {
    if(!ids.includes(item.id))continue;
    const data=object(item.data);
    const moments=Array.isArray(data.dominic_life_moments)?data.dominic_life_moments:[];
    const next=[...moments.filter((m:any)=>m?.lived_event_id!==event.id),{
      ...basis,occurred_at:at,summary:textValue(event.summary),related_item_ids:createdIds
    }].slice(-12);
    const {data:updated,error}=await db.from("diario_items").update({data:{...data,dominic_life_moments:next}})
      .eq("user_id",uid).eq("id",item.id).eq("updated_at",item.updated_at).select("id");
    if(error)throw error;
    if(!updated?.length)throw new Error("Object changed concurrently; retry consequences");
  }
  const {error:doneError}=await db.from("character_actions").update({
    result:{...object(action.result),life_consequences:{version:1,related_item_ids:ids,created_item_ids:createdIds,completed_at:new Date().toISOString()}}
  }).eq("user_id",uid).eq("id",action.id);
  if(doneError)throw doneError;
}

export async function linkLifePhoto(db:DB,uid:string,actionId:number|string,photoId:string) {
  const {data:action,error}=await db.from("character_actions").select("id,lived_event_id,result")
    .eq("user_id",uid).eq("id",actionId).eq("status","completed").eq("source_type","dominic_life_loop").maybeSingle();
  if(error)throw error;
  if(!action?.lived_event_id)return;
  const result=object(action.result).life_consequences;
  if(result?.version!==1)return;
  const {data:photo,error:pe}=await db.from("diario_items").select("id,data,updated_at").eq("user_id",uid)
    .eq("id",photoId).eq("kind","photo").eq("status","active").single();
  if(pe)throw pe;
  if(String(photo.data?.life_action_id)!==String(action.id))return;
  const candidates=[...(result.created_item_ids??[]),...(result.related_item_ids??[])];
  const {data:targets,error:te}=candidates.length?await db.from("diario_items").select("id,kind").eq("user_id",uid)
    .eq("status","active").in("id",candidates):{data:[],error:null};
  if(te)throw te;
  for(const target of targets??[]) {
    if(["story_memory","date"].includes(target.kind))await connect(db,uid,target.id,[photoId],action.lived_event_id);
    else if(["song","place"].includes(target.kind))await connect(db,uid,photoId,[target.id],action.lived_event_id);
  }
  const {error:markError}=await db.from("diario_items").update({data:{...object(photo.data),life_links_complete:true}})
    .eq("user_id",uid).eq("id",photoId).eq("updated_at",photo.updated_at);
  if(markError)throw markError;
}
