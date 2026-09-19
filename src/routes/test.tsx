import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Diário — backend test" },
      { name: "description", content: "Private backend test interface." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Diário — backend test" },
      { property: "og:description", content: "Private backend test interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestPage,
});

function TestPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <main className="test-page">
        <p>loading…</p>
      </main>
    );
  }
  return session ? <TestScreen /> : <LoginForm />;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  return (
    <main className="test-page">
      <form className="test-panel" onSubmit={onSubmit}>
        <h1>Diário — test login</h1>
        <p className="test-note">Private area. Sign in to continue.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="test-error">{error}</p>}
      </form>
    </main>
  );
}

function TestScreen() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendTest() {
    if (!message.trim()) return;
    setBusy(true);
    setError(null);
    setReply(null);
    try {
      const { data, error } = await supabase.functions.invoke("clever-service", {
        body: { message },
      });
      if (error) {
        setError(error.message);
      } else {
        setReply(data?.reply ?? JSON.stringify(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(false);
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <main className="test-page">
      <div className="test-panel">
        <h1>Backend test</h1>
        <label>
          Message
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say something…"
          />
        </label>
        <div className="test-actions">
          <button type="button" onClick={sendTest} disabled={busy}>
            {busy ? "Sending…" : "Send test"}
          </button>
          <button type="button" className="test-logout" onClick={logout}>
            Log out
          </button>
        </div>
        <div className="test-response">
          {error && <p className="test-error">{error}</p>}
          {reply && <p className="test-reply">{reply}</p>}
          {!error && !reply && <p className="test-note">Response will appear here.</p>}
        </div>
      </div>
    </main>
  );
}
