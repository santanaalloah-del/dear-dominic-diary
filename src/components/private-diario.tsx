import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  const [session, setSession] = useState<Session | null>(null);
  const [preferredName, setPreferredName] = useState("Alloah");
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <main className="private-entry private-entry-loading">
        <span className="brand-mark">Diário</span>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="private-entry private-entry-locked">
        <div className="private-lock-mark" aria-hidden="true">
          ✦
        </div>

        <span className="brand-mark">Diário</span>

        <p className="private-lock-copy">
          private access is being prepared
        </p>
      </main>
    );
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
