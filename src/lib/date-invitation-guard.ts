/** No Date invitation from Dominic becomes a shared plan without explicit consent. */
export type InvitationDateShape = {
  owner?: string | null;
  data?: Record<string, unknown> | null;
  planned_for?: string | null;
};
export function isPendingDominicInvitation(date: InvitationDateShape): boolean {
  const info = date.data ?? {};
  if (info.accepted_at) return false;
  return (info.source === "dominic_chat_invitation" && info.invitation_pending === true) ||
    (date.owner === "dominic" && info.proposed_by === "dominic" && info.requires_user_action === true);
}
export function pendingInvitationHasAgreedDetails(date: InvitationDateShape): boolean {
  if (!isPendingDominicInvitation(date)) return false;
  const data = date.data ?? {};
  const when = typeof data.proposed_for === "string" ? data.proposed_for : null;
  return Boolean(typeof data.place === "string" && data.place.trim() &&
    when && Number.isFinite(Date.parse(when)) && data.proposed_time_known === true);
}
