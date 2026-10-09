import { describe, expect, test, mock } from "bun:test";
import { persistDominicDateProposal } from "../src/lib/date-proposal-server";

describe("unconfirmed real date ideas", () => {
  test("saves a genuine invitation as an IDEA, never an agreed planned or lived date", async () => {
    const oldFetch=globalThis.fetch;
    const calls: Array<{url:string,body:any}>=[];
    globalThis.fetch=mock(async (url: string|URL|Request,opts?:RequestInit) => {
      const path=String(url);
      const body=opts?.body?JSON.parse(String(opts.body)):null;
      calls.push({url:path,body});
      if(path.includes("order=created_at"))return new Response("[]",{status:200});
      if(path.includes("diario_links"))return new Response("{}",{status:201});
      if(body?.kind==="date")return new Response(JSON.stringify([{id:"date-1"}]),{status:201});
      if(body?.kind==="chat_media")return new Response(JSON.stringify([{id:"chat-1"}]),{status:201});
      return new Response("{}",{status:200});
    }) as typeof fetch;
    try{
      const result=await persistDominicDateProposal({
        userId:"user-1",
        proposal:{type:"propose_date",title:"Coffee together",place:"some coffee shop",note:"He invited her for coffee."},
        supabaseUrl:"https://test.supabase.co",serviceKey:"test-only",
      });
      expect(result).toEqual({created:true,id:"date-1"});
      const date=calls.find(x=>x.body?.kind==="date")?.body;
      expect(date.planned_for).toBe(null);
      expect(date.data.flow_state).toBe("idea");
      expect(date.data.invitation_pending).toBe(true);
      expect(date.data.invited_by).toBe("dominic");
      const chat=calls.find(x=>x.body?.kind==="chat_media")?.body;
      expect(chat.data.media_type).toBe("shared_item");
      expect(chat.data.shared_item_id).toBe("date-1");
    }finally{globalThis.fetch=oldFetch}
  });
  test("same active invitation isn't duplicated",async()=>{
    const oldFetch=globalThis.fetch;
    let insertCount=0;
    globalThis.fetch=mock(async (_url:string|URL|Request,opts?:RequestInit)=>{
      if(opts?.method==="POST")insertCount++;
      return new Response(JSON.stringify([{id:"existing",title:"Coffee together",created_at:new Date().toISOString(),data:{source:"dominic_chat_invitation",flow_state:"idea",place:"Cafe"}}]),{status:200});
    }) as typeof fetch;
    try{
      const result=await persistDominicDateProposal({
        userId:"user-1",proposal:{type:"propose_date",title:"Coffee together",place:"Cafe"},
        supabaseUrl:"https://test.supabase.co",serviceKey:"test-only",
      });
      expect(result).toEqual({created:false,id:"existing"});
      expect(insertCount).toBe(0);
    }finally{globalThis.fetch=oldFetch}
  });
});
