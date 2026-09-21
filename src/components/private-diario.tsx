import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { BookHeart, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PrivateDiarioContextValue = {
  session: Session;
  preferredName: string;
  signOut: () => Promise<void>;
};

const PrivateDiarioContext =
  createContext<PrivateDiarioContextValue | null>(null);

const APP_LOCK_KEY = "diario_app_lock_v1";

export function usePrivateDiario() {
  const context = useContext(PrivateDiarioContext);

  if (!context) {
    throw new Error("usePrivateDiario must be used inside PrivateDiario");
  }

  return context;
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function PrivateDiario({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [preferredName, setPreferredName] = useState("Alloah");
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [privacyCover, setPrivacyCover] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;

      setSession(data.session);
      setReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;

        setSession(nextSession);
        setReady(true);

        if (!nextSession) {
          setUnlocked(false);
        }
      }
    );

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    let active = true;

    supabase
      .from("user_profile")
      .select("preferred_name")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.preferred_name) {
          setPreferredName(data.preferred_name);
        }
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let revealTimer: number | undefined;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setPrivacyCover(true);
        setUnlocked(false);
        return;
      }

      if (document.visibilityState === "visible") {
        revealTimer = window.setTimeout(() => {
          setPrivacyCover(false);
        }, 250);
      }
    };

    const handlePageHide = () => {
      setPrivacyCover(true);
      setUnlocked(false);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);

      if (revealTimer) {
        window.clearTimeout(revealTimer);
      }
    };
  }, []);

  if (!ready) {
    return (
      <main className="private-entry private-entry-loading">
        <span className="brand-mark">Diário</span>
      </main>
    );
  }

  if (!session) {
    return <PrivateLogin />;
  }

  if (privacyCover) {
    return <PrivacyCover />;
  }

  if (!unlocked) {
    return <AppPasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <PrivateDiarioContext.Provider
      value={{
        session,
        preferredName,
        signOut: async () => {
          setUnlocked(false);
          setPrivacyCover(true);

          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </PrivateDiarioContext.Provider>
  );
}

function PrivacyCover() {
  return (
    <main className="privacy-cover" aria-hidden="true">
      <div className="privacy-cover-mark">
        <span>Diário</span>
        <i>✦</i>
      </div>
    </main>
  );
}

function AppPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [hasPassword, setHasPassword] = useState(
    () => Boolean(localStorage.getItem(APP_LOCK_KEY))
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError("Use pelo menos 4 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setBusy(true);

    try {
      const hashed = await hashPassword(password);

      localStorage.setItem(APP_LOCK_KEY, hashed);

      setHasPassword(true);
      setPassword("");
      setConfirmPassword("");

      onUnlock();
    } catch {
      setError("Não foi possível criar a senha agora.");
    } finally {
      setBusy(false);
    }
  }

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const savedHash = localStorage.getItem(APP_LOCK_KEY);
      const typedHash = await hashPassword(password);

      if (!savedHash || savedHash !== typedHash) {
        setError("Senha incorreta.");
        return;
      }

      setPassword("");
      onUnlock();
    } catch {
      setError("Não foi possível desbloquear agora.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasPassword) {
    return (
      <main className="private-entry">
        <section
          className="private-login private-lock-screen"
          aria-labelledby="create-private-password"
        >
          <LockKeyhole aria-hidden="true" />

          <p className="private-kicker">private diary</p>

          <h1 id="create-private-password">
            Create your password
          </h1>

          <p className="private-note">
            This password stays on this device and locks Diário whenever you leave it.
          </p>

          <form onSubmit={createPassword}>
            <label>
              Password

              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </label>

            <label>
              Confirm password

              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
              />
            </label>

            <Button
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save password"}
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

  return (
    <main className="private-entry private-entry-locked">
      <section
        className="private-login private-lock-screen"
        aria-labelledby="unlock-diario"
      >
        <LockKeyhole aria-hidden="true" />

        <p className="private-kicker">
          private
        </p>

        <h1 id="unlock-diario">
          Diário
        </h1>

        <p className="private-note">
          enter your password to come back in.
        </p>

        <form onSubmit={unlock}>
          <label>
            Password

            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoFocus
              required
            />
          </label>

          <Button
            type="submit"
            disabled={busy}
          >
            {busy ? "Opening…" : "Come in"}
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

function PrivateLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError(null);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
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
        <BookHeart aria-hidden="true" />

        <p className="private-kicker">
          first setup
        </p>

        <h1 id="private-login-title">
          Diário
        </h1>

        <p className="private-note">
          Sign in once on this device. After that, Diário uses only your private app password.
        </p>

        <form onSubmit={onSubmit}>
          <label>
            Email

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
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
                setPassword(event.target.value)
              }
              required
            />
          </label>

          <Button
            type="submit"
            disabled={busy}
          >
            {busy ? "Opening…" : "Continue"}
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
