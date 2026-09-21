import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

  const [privacyCover, setPrivacyCover] =
    useState(false);

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
    let revealTimer:
      | number
      | undefined;

    const hideContent = () => {
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
  }, []);

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

  if (privacyCover) {
    return <PrivacyCover />;
  }

  return (
    <PrivateDiarioContext.Provider
      value={{
        session,
        preferredName,

        signOut: async () => {
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
