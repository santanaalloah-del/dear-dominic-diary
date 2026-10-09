import { describe, test, expect } from "bun:test";
import { isPendingDominicInvitation, pendingInvitationHasAgreedDetails } from "../src/lib/date-invitation-guard";
describe("Dominic invitations cannot silently become planned Dates", () => {
  const chat = { owner:"shared", data:{ source:"dominic_chat_invitation",
    flow_state:"idea", invitation_pending:true, place:"Cafe",
    proposed_for:"2026-10-11T19:00:00Z", proposed_time_known:true } };
  const life = { owner:"dominic", data:{ proposed_by:"dominic", flow_state:"idea",
    requires_user_action:true } };
  test("recognizes pending invitations from chat and real solo life", () => {
    expect(isPendingDominicInvitation(chat)).toBe(true);
    expect(isPendingDominicInvitation(life)).toBe(true);
  });
  test("requires a precise agreed date and place before showing confirm", () => {
    expect(pendingInvitationHasAgreedDetails(chat)).toBe(true);
    expect(pendingInvitationHasAgreedDetails(life)).toBe(false);
    expect(pendingInvitationHasAgreedDetails({ ...chat,data:{...chat.data, proposed_time_known:false} })).toBe(false);
    expect(pendingInvitationHasAgreedDetails({ ...chat,data:{...chat.data, place:""} })).toBe(false);
    expect(pendingInvitationHasAgreedDetails({ ...chat,data:{...chat.data, proposed_for:"invalid"} })).toBe(false);
  });
  test("after acceptance the same Date is no longer awaiting agreement", () => {
    const accepted={owner:"shared", data:{...chat.data,accepted_at:"2026-10-09T18:00:00Z",invitation_pending:false}};
    expect(isPendingDominicInvitation(accepted)).toBe(false);
    expect(pendingInvitationHasAgreedDetails(accepted)).toBe(false);
  });
  test("unrelated Dates do not require an invitation acceptance", () => {
    expect(isPendingDominicInvitation({owner:"shared",data:{flow_state:"idea"}})).toBe(false);
  });
});
