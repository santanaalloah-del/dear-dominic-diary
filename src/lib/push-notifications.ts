import { supabase } from "@/integrations/supabase/client";

type PushSubscriptionLike = {
  id?: string | null;
  token?: string | null;
  optedIn?: boolean;
  optIn?: () => Promise<void>;
  addEventListener?: (event: "change", listener: (event?: unknown) => void) => void;
  removeEventListener?: (event: "change", listener: (event?: unknown) => void) => void;
};

type OneSignalLike = {
  login?: (externalId: string) => Promise<void>;
  User?: { PushSubscription?: PushSubscriptionLike };
  Notifications?: {
    permission?: boolean;
    permissionNative?: string;
    requestPermission?: () => Promise<boolean | void>;
  };
};

function readSubscriptionId(OneSignal: OneSignalLike) {
  return OneSignal.User?.PushSubscription?.id || null;
}

function waitForSubscriptionId(OneSignal: OneSignalLike, timeoutMs = 30000) {
  return new Promise<string | null>((resolve) => {
    const subscription = OneSignal.User?.PushSubscription;
    const existing = readSubscriptionId(OneSignal);
    if (existing) {
      resolve(existing);
      return;
    }

    let finished = false;
    let timer = 0;

    const finish = (id: string | null) => {
      if (finished) return;
      finished = true;
      if (timer) window.clearInterval(timer);
      subscription?.removeEventListener?.("change", onChange);
      resolve(id);
    };

    const onChange = () => {
      const id = readSubscriptionId(OneSignal);
      if (id) finish(id);
    };

    subscription?.addEventListener?.("change", onChange);

    const started = Date.now();
    timer = window.setInterval(() => {
      const id = readSubscriptionId(OneSignal);
      if (id) {
        finish(id);
        return;
      }
      if (Date.now() - started >= timeoutMs) finish(null);
    }, 250);
  });
}

function withOneSignal(run: (oneSignal: OneSignalLike) => void | Promise<void>) {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(run);
}

async function saveDevice(userId: string, subscriptionId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase.from("push_devices").upsert({
    user_id: userId,
    platform: "onesignal_web",
    push_token: subscriptionId,
    device_name: navigator.userAgent.includes("iPhone") ? "iPhone" : "Web",
    is_active: true,
    last_seen_at: now,
    updated_at: now,
  }, { onConflict: "user_id,push_token" });

  if (error) throw error;
}

export async function enableDiarioPush(userId: string) {
  return new Promise<{ enabled: boolean; reason?: string; diagnostic?: string }>((resolve) => {
    withOneSignal(async (OneSignal) => {
      try {
        // On iOS, requesting permission must stay as close as possible to the
        // user's tap. Do it before login/network work can consume user activation.
        if (!OneSignal.Notifications?.permission) {
          await OneSignal.Notifications?.requestPermission?.();
        }
        if (!OneSignal.Notifications?.permission) {
          resolve({ enabled: false, reason: "permission_denied" });
          return;
        }

        await OneSignal.login?.(userId);

        const existingId = readSubscriptionId(OneSignal);
        if (existingId) {
          await saveDevice(userId, existingId);
          resolve({ enabled: true });
          return;
        }

        await OneSignal.User?.PushSubscription?.optIn?.();
        const subscriptionId = await waitForSubscriptionId(OneSignal);

        if (!subscriptionId) {
          console.warn("OneSignal permission exists but subscription ID did not arrive.", {
            permission: OneSignal.Notifications?.permission,
            permissionNative: OneSignal.Notifications?.permissionNative,
            optedIn: OneSignal.User?.PushSubscription?.optedIn,
            tokenPresent: Boolean(OneSignal.User?.PushSubscription?.token),
            standalone: window.matchMedia("(display-mode: standalone)").matches,
            origin: window.location.origin,
          });
          const registration = await navigator.serviceWorker?.getRegistration?.("/").catch(() => null);\n          const diagnostic = [\n            `permission=${String(OneSignal.Notifications?.permission)}`,\n            `native=${String(OneSignal.Notifications?.permissionNative ?? "unknown")}`,\n            `optedIn=${String(OneSignal.User?.PushSubscription?.optedIn)}`,\n            `token=${OneSignal.User?.PushSubscription?.token ? "yes" : "no"}`,\n            `worker=${registration?.active ? "active" : registration?.installing ? "installing" : registration?.waiting ? "waiting" : "missing"}`,\n            `standalone=${window.matchMedia("(display-mode: standalone)").matches ? "yes" : "no"}`,\n            `origin=${window.location.origin}`,\n          ].join(" · ");\n          resolve({ enabled: false, reason: "subscription_missing", diagnostic });
          return;
        }

        await saveDevice(userId, subscriptionId);
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
