import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
describe("proactive Chat delivery is safe from duplicated paid sends", () => {
 const s = readFileSync(new URL("../supabase/functions/proactive-brain/index.ts", import.meta.url),"utf8");
 test("finds a previously delivered event before reserving AI budget",()=>{
   expect(s).toContain('.contains("attachment_context", {');
   expect(s).toContain('decision: "already_sent"');
   expect(s.indexOf('decision: "already_sent"')).toBeLessThan(s.indexOf('await supabase.rpc("reserve_ai_budget"'));
 });
 test("commits message delivery before optional notification and memory steps",()=>{
   expect(s.indexOf('persistedMessageId = insertedMessage.id;')).toBeLessThan(s.indexOf('record_brain2_message_event'));
   expect(s.indexOf('message_id: insertedMessage.id,')).toBeLessThan(s.indexOf('.from("push_outbox")'));
 });
 test("outbox errors no longer trigger resends, billing or fake unsent status",()=>{
   expect(s).toContain('if (persistedMessageId !== null)');
   expect(s).toContain('recovered_after_message_persisted');
   expect(s).not.toContain('throw pushOutboxError;');
   expect(s).not.toContain('throw livedEventError;');
   expect(s).not.toContain('throw conversationUpdateError;');
 });
});
