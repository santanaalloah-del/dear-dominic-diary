import { supabase } from "@/integrations/supabase/client";

type OneSignalLike = {
  login?: (externalId: string) => Promise<void>;
  User?: { PushSubscription?: { id?: string | null; optedIn?: boolean; optIn?: () => Promise<void> } };
  Notifications?: { permission?: boolean; requestPermission?: () => Promise<boolean | void> };
};

function withOneSignal(run: (oneSignal: OneSignalLike) => void | Promise<void>) {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(run);
}

export async function enableDiarioPush(userId: string) {
  return new Promise<{ enabled: boolean; reason?: string }>((resolve) => {
    withOneSignal(async (OneSignal) => {
      try {
        await OneSignal.login?.(userId);
        if (!OneSignal.Notifications?.permission) {
          await OneSignal.Notifications?.requestPermission?.();
        }
        if (!OneSignal.Notifications?.permission) {
          resolve({ enabled: false, reason: "permission_denied" });
          return;
        }
        await OneSignal.User?.PushSubscription?.optIn?.();
        const subscriptionId = OneSignal.User?.PushSubscription?.id;
        if (!subscriptionId) {
          resolve({ enabled: false, reason: "subscription_missing" });
          return;
        }

        const { error } = await supabase.from("push_devices").upsert({
          user_id: userId,
          platform: "onesignal_web",
          push_token: subscriptionId,
          device_name: navigator.userAgent.includes("iPhone") ? "iPhone" : "Web",
          is_active: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,push_token" });

        if (error) throw error;
        resolve({ enabled: true });
      } catch (error) {
        console.error("Could not enable Diario notifications:", error);
        resolve({ enabled: false, reason: "registration_failed" });
      }
    });
  });
}

export async function getDiarioPushStatus(userId: string) {
  const { data, error } = await supabase
    .from("push_devices")
    .select("id,is_active")
    .eq("user_id", userId)
    .eq("platform", "onesignal_web")
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}
