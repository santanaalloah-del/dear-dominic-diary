/**
 * Persist a REAL invitation Dominic has just made as a Date IDEA.
 * This never confirms, books or starts a Date without Alloah's agreement.
 * The service-role credential stays exclusively in the server route.
 */
export type DominicDateProposal = {
  type: "propose_date";
  title: string;
  place?: string;
  plannedFor?: string;
  note?: string;
};

function normalized(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}


/**
 * A later MUTUALLY AGREED Date should use the SAME original invitation ID.
 * Be deliberately conservative: an unrelated confirmed outing must never
 * overwrite a pending idea. No response from an AI alone implies acceptance.
 */
export async function confirmExistingDominicDateIdea({
  userId, confirmed, supabaseUrl, serviceKey,
}: {
  userId: string;
  confirmed: { type: "create_date"; title: string; place: string; plannedFor: string; note?: string };
  supabaseUrl: string;
  serviceKey: string;
}): Promise<{ updated: boolean; id: string | null }> {
  if (!confirmed.place.trim() || !Number.isFinite(Date.parse(confirmed.plannedFor))) {
    return { updated: false, id: null };
  }
  const headers = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
  };
  const root = supabaseUrl.replace(/\/$/, "") + "/rest/v1/";
  const query = new URLSearchParams({
    user_id: "eq." + userId, kind: "eq.date", status: "eq.active",
    select: "id,title,body,created_at,data", order: "created_at.desc", limit: "50",
  });
  const response = await fetch(root + "diario_items?" + query, { headers });
  if (!response.ok) throw new Error("Could not verify pending Date invitations.");
  const candidates = await response.json() as Array<{
    id: string; title: string | null; body: string | null;
    created_at: string; data: Record<string, unknown> | null;
  }>;
  const matching = candidates.filter(item => {
    const details = item.data;
    return details?.source === "dominic_chat_invitation" &&
      details?.flow_state === "idea" &&
      details?.invitation_pending === true &&
      Date.now() - Date.parse(item.created_at) >= 0 &&
      Date.now() - Date.parse(item.created_at) < 14 * 86400_000 &&
      (normalized(item.title) === normalized(confirmed.title) ||
        (normalized(String(details?.place ?? "")) !== "" &&
          normalized(String(details?.place)) === normalized(confirmed.place)));
  });
  // Two equally plausible old invitations? Do not guess which one was accepted.
  if (matching.length !== 1) return { updated: false, id: null };
  const existing = matching[0];
  const now = new Date().toISOString();
  const params = new URLSearchParams({
    id: "eq." + existing.id, user_id: "eq." + userId,
    kind: "eq.date", status: "eq.active",
    "data->>flow_state": "eq.idea",
  });
  const updated = await fetch(root + "diario_items?" + params, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      title: confirmed.title,
      body: confirmed.note ?? existing.body,
      planned_for: new Date(confirmed.plannedFor).toISOString(),
      data: {
        ...existing.data,
        flow_state: "planned",
        invitation_pending: false,
        accepted_at: now,
        place: confirmed.place,
        time_known: true,
        time_hint: null,
      },
    }),
  });
  if (!updated.ok) throw new Error("Could not confirm the existing Date idea.");
  const rows = await updated.json() as Array<{ id: string }>;
  return rows.length === 1 && rows[0].id === existing.id
    ? { updated: true, id: existing.id }
    : { updated: false, id: null };
}

export async function persistDominicDateProposal({
  userId, proposal, supabaseUrl, serviceKey,
}: {
  userId: string;
  proposal: DominicDateProposal;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<{ created: boolean; id: string | null }> {
  const headers = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
  };
  const root = supabaseUrl.replace(/\/$/, "") + "/rest/v1/";
  const query = new URLSearchParams({
    user_id: "eq." + userId, kind: "eq.date", status: "eq.active",
    select: "id,title,created_at,data", order: "created_at.desc", limit: "50",
  });
  const read = await fetch(root + "diario_items?" + query, { headers });
  if (!read.ok) throw new Error("Could not check existing Date ideas.");
  const existing = await read.json() as Array<{
    id: string; title: string | null; created_at: string;
    data: Record<string, unknown> | null;
  }>;
  const match = existing.find(item =>
    item.data?.source === "dominic_chat_invitation" &&
    item.data?.flow_state === "idea" &&
    Date.now() - Date.parse(item.created_at) < 14 * 86400_000 &&
    (normalized(item.title) === normalized(proposal.title) ||
      (proposal.place && normalized(String(item.data?.place ?? "")) === normalized(proposal.place)))
  );
  if (match) return { created: false, id: match.id };

  const now = new Date().toISOString();
  const response = await fetch(root + "diario_items", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      kind: "date",
      owner: "shared",
      status: "active",
      title: proposal.title,
      body: proposal.note ?? null,
      event_at: null,
      planned_for: null,
      data: {
        source: "dominic_chat_invitation",
        flow_state: "idea",
        invitation_pending: true,
        invited_by: "dominic",
        proposed_for: proposal.plannedFor ?? null,
        place: proposal.place ?? null,
        time_known: false,
      },
    }),
  });
  if (!response.ok) throw new Error("Could not save Dominic's Date idea.");
  const created = await response.json() as Array<{ id: string }>;
  const dateId = created[0]?.id;
  if (!dateId) throw new Error("Date idea ID was not returned.");

  // Use the already-supported shared-item message; no new Chat widget is
  // needed, and the link opens the real Date idea inside the Diary.
  const chat = await fetch(root + "diario_items", {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      kind: "chat_media",
      owner: "dominic",
      status: "active",
      title: "Date invitation",
      body: proposal.note ?? proposal.title,
      event_at: now,
      planned_for: null,
      data: {
        media_type: "shared_item",
        chat_sender: "dominic",
        shared_kind: "date",
        shared_title: "Date idea · " + proposal.title,
        shared_subtitle: "His invitation · not agreed yet",
        shared_item_id: dateId,
      },
    }),
  });
  if (!chat.ok) {
    console.error("Date idea saved; Chat invitation card could not be created.");
    return { created: true, id: dateId };
  }
  const chatItems = await chat.json() as Array<{ id: string }>;
  if (chatItems[0]?.id) {
    await fetch(root + "diario_links", {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({
        user_id: userId,
        source_item_id: chatItems[0].id,
        target_item_id: dateId,
        relation: "created_from_chat",
        data: { invitation: true },
      }),
    }).catch(() => undefined);
  }
  return { created: true, id: dateId };
}
