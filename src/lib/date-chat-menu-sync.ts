import { supabase } from "@/integrations/supabase/client";
import { collectChatMenu, readChatMenu } from "./date-chat-menu";
import { notifyDateExperienceChanged } from "./date-live-events";
import type { DateChatLine } from "./date-chat-observation";
import type { DiarioItem } from "./diario-world";
const db = supabase as any;

export async function syncChatMenu(
  userId: string,
  messages: DateChatLine[],
  dateId?: string,
): Promise<DiarioItem | null> {
  // Retry a compare-and-swap if another tab or a movement action changed data.
  for (let attempt = 0; attempt < 3; attempt++) {
    let query = db
      .from("diario_items")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", "date")
      .eq("status", "active");
    query = dateId ? query.eq("id", dateId) : query.eq("data->>flow_state", "live");
    const { data: rows, error } = await query;
    if (error) throw error;
    if (rows?.length !== 1) return null;
    const date = rows[0] as DiarioItem;
    if (date.data?.flow_state !== "live") return date;
    const menu = collectChatMenu(date, messages);
    if (JSON.stringify(menu) === JSON.stringify(readChatMenu(date))) return date;
    const { data, error: writeError } = await db
      .from("diario_items")
      .update({ data: { ...date.data, chat_menu: menu } })
      .eq("user_id", userId)
      .eq("kind", "date")
      .eq("id", date.id)
      .eq("updated_at", date.updated_at)
      .select("*")
      .maybeSingle();
    if (writeError) throw writeError;
    if (data) {
      notifyDateExperienceChanged(date.id);
      return data as DiarioItem;
    }
  }
  throw new Error("The Date changed while its menu was syncing. Please reopen Here.");
}
