import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { BookHeart, Fingerprint, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getDiarioSettings } from "@/lib/diario-world";
import {
  AppShellContinuity,
  clearAppShellContinuity,
} from "@/components/app-shell-continuity";

type PrivateDiarioContextValue = {
  session: Session;
  preferredName: string;
  signOut: () => Promise<void>;
};

const PrivateDiarioContext =
  createContext<PrivateDiarioContextValue | null>(null);

export function usePrivateDiario() {
  const context = useContext(PrivateDiarioContext);

  if (!context) {
    throw new Error(
      "usePrivateDiario must be used inside PrivateDiario"
    );
  }

  return context;
}

const biometricKey = (userId: string) => `diario-biometric-v1:${userId}`;

function decodeCredentialId(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encodeCredentialId(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function canUseDeviceUnlock() {
  return typeof window !== "undefined" && window.isSecureContext &&
    typeof PublicKeyCredential !== "undefined" && Boolean(navigator.credentials);
}

async function enrollDeviceUnlock(userId: string) {
  if (!canUseDeviceUnlock()) throw new Error("Device unlock is not available in this browser.");
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Diário" },
      user: { id: new TextEncoder().encode(userId), name: "Diário owner", displayName: "Diário owner" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
      timeout: 60000,
      attestation: "none",
    },
  }) as PublicKeyCredential | null;
  if (!credential) throw new Error("Device unlock was not enabled.");
  localStorage.setItem(biometricKey(userId), encodeCredentialId(credential.rawId));
}

async function verifyDeviceUnlock(userId: string) {
  const stored = localStorage.getItem(biometricKey(userId));
  if (!stored || !canUseDeviceUnlock()) throw new Error("Device unlock is unavailable.");
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: decodeCredentialId(stored), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;
  if (!assertion || encodeCredentialId(assertion.rawId) !== stored) {
    throw new Error("Could not verify this device.");
  }
}

export function PrivateDiario({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [preferredName, setPreferredName] =
    useState("Alloah");

  const [ready, setReady] =
    useState(false);

  const [deviceLocked, setDeviceLocked] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [privacyCover, setPrivacyCover] =
    useState(false);

  const [
    privacyCoverEnabled,
    setPrivacyCoverEnabled,
  ] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;

        setSession(data.session);
        setReady(true);
      });

    const { data } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          if (!active) return;

          setSession(nextSession);
          setReady(true);
        }
      );

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setDeviceLocked(false);
      setBiometricEnabled(false);
      return;
    }
    const enabled = Boolean(localStorage.getItem(biometricKey(userId)));
    setBiometricEnabled(enabled);
    setDeviceLocked(enabled);
  }, [session?.user?.id]);

  useEffect(() => {
    const lockOnReturn = () => {
      const userId = session?.user?.id;
      if (userId && localStorage.getItem(biometricKey(userId))) {
        setDeviceLocked(true);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lockOnReturn();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", lockOnReturn);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", lockOnReturn);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;

    let active = true;

    supabase
      .from("user_profile")
      .select("preferred_name")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (
          active &&
          data?.preferred_name
        ) {
          setPreferredName(
            data.preferred_name
          );
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let active = true;

    getDiarioSettings(
      session.user.id
    )
      .then((settings) => {
        if (!active) return;

        setPrivacyCoverEnabled(
          settings.privacy_cover
        );

        if (!settings.privacy_cover) {
          setPrivacyCover(false);
        }
      })
      .catch((error) => {
        console.error(
          "Could not load privacy setting:",
          error
        );
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let revealTimer:
      | number
      | undefined;

    const hideContent = () => {
      if (!privacyCoverEnabled) {
        setPrivacyCover(false);
        return;
      }

      if (revealTimer) {
        window.clearTimeout(
          revealTimer
        );
      }

      setPrivacyCover(true);
    };

    const showContent = () => {
      if (revealTimer) {
        window.clearTimeout(
          revealTimer
        );
      }

      revealTimer =
        window.setTimeout(() => {
          setPrivacyCover(false);
        }, 250);
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        hideContent();
        return;
      }

      if (
        document.visibilityState ===
        "visible"
      ) {
        showContent();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    window.addEventListener(
      "pagehide",
      hideContent
    );

    window.addEventListener(
      "pageshow",
      showContent
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      window.removeEventListener(
        "pagehide",
        hideContent
      );

      window.removeEventListener(
        "pageshow",
        showContent
      );

      if (revealTimer) {
        window.clearTimeout(
          revealTimer
        );
      }
    };
  }, [privacyCoverEnabled]);

  if (!ready) {
    return (
      <main className="private-entry private-entry-loading">
        <span className="brand-mark">
          Diário
        </span>
      </main>
    );
  }

  if (!session) {
    return <PrivateLogin />;
  }

  return (
    <PrivateDiarioContext.Provider
      value={{
        session,
        preferredName,

        signOut: async () => {
          clearAppShellContinuity();
          await supabase.auth.signOut();
        },
      }}
    >
      <AppShellContinuity />

      {children}

      {deviceLocked && biometricEnabled ? (
        <main className="private-entry" style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}>
          <section className="private-login" aria-label="Unlock Diário" style={{ textAlign: "center" }}>
            <LockKeyhole aria-hidden="true" />
            <p className="private-kicker">private</p>
            <h1>Diário</h1>
            <p className="private-note">Unlock with Face ID or your device security.</p>
            <Button disabled={unlockBusy} onClick={async () => {
              setUnlockBusy(true);
              setUnlockError(null);
              try {
                await verifyDeviceUnlock(session.user.id);
                setDeviceLocked(false);
              } catch {
                setUnlockError("Could not unlock. Try again or sign in with your password.");
              } finally {
                setUnlockBusy(false);
              }
            }}><Fingerprint /> {unlockBusy ? "Unlocking…" : "Unlock Diário"}</Button>
            {unlockError && <p className="private-error" role="alert">{unlockError}</p>}
            <Button variant="outline" onClick={async () => {
              clearAppShellContinuity();
              await supabase.auth.signOut();
            }}>Use account password</Button>
          </section>
        </main>
      ) : !biometricEnabled && !deviceLocked && canUseDeviceUnlock() ? (
        <div style={{ position: "fixed", bottom: 14, left: 14, zIndex: 1000 }}>
          <Button variant="outline" onClick={async () => {
            try {
              await enrollDeviceUnlock(session.user.id);
              setBiometricEnabled(true);
              setDeviceLocked(true);
            } catch {
              setUnlockError("Could not enable Face ID on this device.");
            }
          }}><Fingerprint /> Enable Face ID</Button>
          {unlockError && <p className="private-error" role="alert">{unlockError}</p>}
        </div>
      ) : null}
      {privacyCover && !deviceLocked && (
        <PrivacyCover />
      )}
    </PrivateDiarioContext.Provider>
  );
}

function PrivacyCover() {
  return (
    <main
      className="privacy-cover"
      aria-hidden="true"
    >
      <div className="privacy-cover-mark">
        <span>Diário</span>
        <i>✦</i>
      </div>
    </main>
  );
}

function PrivateLogin() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function onSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setError(null);

    const { error: signInError } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });

    if (signInError) {
      setError(
        "That didn’t open the door. Check your details and try again."
      );
    }

    setBusy(false);
  }

  return (
    <main className="private-entry">
      <section
        className="private-login"
        aria-labelledby="private-login-title"
      >
        <BookHeart
          aria-hidden="true"
        />

        <p className="private-kicker">
          private
        </p>

        <h1 id="private-login-title">
          Diário
        </h1>

        <p className="private-note">
          Sign in on this device.
          Your session stays private
          until you choose to leave.
        </p>

        <form onSubmit={onSubmit}>
          <label>
            Email

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
            />
          </label>

          <Button
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Opening…"
              : "Continue"}
          </Button>

          {error && (
            <p
              className="private-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
