import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VOICE_ID = "b155ef90-3fe4-4ed0-ae73-e0b6d6b38250";
const MODEL_ID = "sonic-3.6";
const MAX_TRANSCRIPT_CHARS = 1200;
const VOICE_HARD_CAP = 12000;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeForSpeech(value: string) {
  return value
    .replace(/\b([A-Za-z])\1{2,}\b/g, "$1$1")
    .replace(/\b([A-Za-z]{2,})\1{2,}\b/g, "$1$1")
    .replace(/([!?.,])\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ")
    .trim();
}

async function reserveInternalVoiceBudget(admin: any, userId: string, chars: number) {
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: row, error } = await admin
      .from("voice_tts_usage")
      .select("month_start,used_chars,hard_cap_chars")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    if (!row) {
      const { data: inserted, error: insertError } = await admin
        .from("voice_tts_usage")
        .insert({
          user_id: userId,
          month_start: monthStart,
          used_chars: chars,
          hard_cap_chars: VOICE_HARD_CAP,
          updated_at: new Date().toISOString(),
        })
        .select("used_chars,hard_cap_chars")
        .maybeSingle();
      if (insertError?.code === "23505") continue;
      if (insertError) throw insertError;
      return {
        allowed: true,
        used_chars: inserted?.used_chars ?? chars,
        hard_cap_chars: inserted?.hard_cap_chars ?? VOICE_HARD_CAP,
      };
    }

    const cap = Number(row.hard_cap_chars ?? VOICE_HARD_CAP);
    const used = row.month_start === monthStart ? Number(row.used_chars ?? 0) : 0;
    if (used + chars > cap) {
      return { allowed: false, used_chars: used, hard_cap_chars: cap };
    }

    const { data: updated, error: updateError } = await admin
      .from("voice_tts_usage")
      .update({
        month_start: monthStart,
        used_chars: used + chars,
        hard_cap_chars: cap,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("month_start", row.month_start)
      .eq("used_chars", row.used_chars)
      .select("used_chars,hard_cap_chars")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) {
      return {
        allowed: true,
        used_chars: updated.used_chars,
        hard_cap_chars: updated.hard_cap_chars,
      };
    }
  }
  throw new Error("Could not reserve internal voice budget after concurrent updates.");
}

async function refundInternalVoiceBudget(admin: any, userId: string, chars: number) {
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: row, error } = await admin
      .from("voice_tts_usage")
      .select("month_start,used_chars")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!row || row.month_start !== monthStart) return;

    const used = Number(row.used_chars ?? 0);
    const { data: updated, error: updateError } = await admin
      .from("voice_tts_usage")
      .update({
        used_chars: Math.max(0, used - chars),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("month_start", monthStart)
      .eq("used_chars", used)
      .select("used_chars")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return;
  }
  throw new Error("Could not refund internal voice budget after concurrent updates.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const cartesiaApiKey = Deno.env.get("CARTESIA_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Voice service is not configured", fallback: "text" }, 503);
    }
    if (!authHeader) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    if (!cartesiaApiKey) {
      return jsonResponse({ error: "Voice is not configured", fallback: "text" }, 503);
    }

    const body = await req.json();
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    const spokenTranscript = normalizeForSpeech(transcript);
    if (!transcript) {
      return jsonResponse({ error: "Transcript is required" }, 400);
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return jsonResponse({ error: "Voice note is too long", fallback: "text" }, 413);
    }

    // Internal service-to-service calls are accepted only with the exact
    // Supabase service-role credential, which never leaves trusted Edge Functions.
    const internalCall = authHeader === `Bearer ${serviceRoleKey}`;
    let supabase: any;
    let userId: string;

    if (internalCall) {
      userId = typeof body?.user_id === "string" ? body.user_id : "";
      if (!userId) {
        return jsonResponse({ error: "Internal voice call requires user_id" }, 400);
      }
      supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: settings, error: settingsError } = await supabase
        .from("diario_settings")
        .select("voice_enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (settingsError) throw settingsError;
      if (settings?.voice_enabled !== true) {
        return jsonResponse({ error: "Voice is disabled for this user", fallback: "text" }, 403);
      }
    } else {
      supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: "Invalid user" }, 401);
      }
      userId = user.id;
    }

    let budget: any;
    if (internalCall) {
      budget = await reserveInternalVoiceBudget(supabase, userId, transcript.length);
    } else {
      const { data: reservation, error: reservationError } = await supabase.rpc(
        "reserve_voice_tts_chars",
        { p_chars: transcript.length },
      );
      if (reservationError) {
        console.error("Could not reserve voice budget:", reservationError);
        return jsonResponse({ error: "Voice budget unavailable", fallback: "text" }, 503);
      }
      budget = Array.isArray(reservation) ? reservation[0] : reservation;
    }

    // A denied reservation has not consumed any characters, so do not refund it.
    if (!budget?.allowed) {
      return jsonResponse({
        error: "Free voice budget reached",
        fallback: "text",
        usedChars: budget?.used_chars ?? null,
        hardCapChars: budget?.hard_cap_chars ?? VOICE_HARD_CAP,
      }, 402);
    }

    let storagePath: string | null = null;
    try {
      const cartesiaResponse = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cartesiaApiKey}`,
          "Cartesia-Version": "2026-08-14",
        },
        body: JSON.stringify({
          model_id: MODEL_ID,
          transcript: spokenTranscript,
          voice: VOICE_ID,
          language: "en",
          output_format: {
            container: "mp3",
            sample_rate: 44100,
            bit_rate: 128000,
          },
        }),
      });

      if (!cartesiaResponse.ok) {
        const errorText = await cartesiaResponse.text().catch(() => "");
        throw new Error(errorText || `Cartesia returned ${cartesiaResponse.status}`);
      }

      const audioBuffer = await cartesiaResponse.arrayBuffer();
      storagePath = `${userId}/chat/dominic-voice-${crypto.randomUUID()}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from("diario-media")
        .upload(storagePath, new Uint8Array(audioBuffer), {
          contentType: "audio/mpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const now = new Date().toISOString();
      const { error: itemError } = await supabase.from("diario_items").insert({
        user_id: userId,
        kind: "chat_media",
        owner: "dominic",
        status: "active",
        title: "Voice note",
        body: null,
        event_at: now,
        planned_for: null,
        data: {
          media_type: "voice",
          storage_bucket: "diario-media",
          storage_path: storagePath,
          transcript,
          spoken_transcript: spokenTranscript,
          chat_sender: "dominic",
          generated: true,
          provider: "cartesia",
          provider_model: MODEL_ID,
          voice_id: VOICE_ID,
        },
      });
      if (itemError) throw itemError;

      return jsonResponse({
        ok: true,
        storagePath,
        transcript,
        spokenTranscript,
        usedChars: budget.used_chars,
        hardCapChars: budget.hard_cap_chars,
      });
    } catch (error) {
      if (storagePath) {
        await supabase.storage.from("diario-media").remove([storagePath]).catch(() => undefined);
      }
      try {
        if (internalCall) {
          await refundInternalVoiceBudget(supabase, userId, transcript.length);
        } else {
          await supabase.rpc("refund_voice_tts_chars", { p_chars: transcript.length });
        }
      } catch (refundError) {
        console.error("Voice budget refund failed:", refundError);
      }
      console.error("Dominic voice generation failed:", error);
      return jsonResponse({
        error: error instanceof Error ? error.message : "Voice generation failed",
        fallback: "text",
      }, 502);
    }
  } catch (error) {
    console.error("dominic-voice-tts error:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: "text",
    }, 500);
  }
});
