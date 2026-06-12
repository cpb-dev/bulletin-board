"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Our Little Board";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/board");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/board");
          router.refresh();
        } else {
          setNotice(
            "Almost there — check your email to confirm your account, then sign in. 💌"
          );
          setMode("sign-in");
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(
        message.includes("guest list")
          ? "This board is private — that email isn't on the guest list. 🔒"
          : message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="cute-panel pop-in w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="float-y text-5xl mb-2" aria-hidden>
            📌
          </div>
          <h1 className="hand text-4xl">{APP_NAME}</h1>
          <p className="mt-1 text-sm opacity-75">
            A cozy little corner just for the two of us.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "sign-up" && (
            <input
              className="cute-input"
              type="text"
              placeholder="What should we call you? (e.g. Kalli)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={24}
              required
            />
          )}
          <input
            className="cute-input"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="cute-input"
            type="password"
            placeholder="Password"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-emerald-300">{notice}</p>}

          <button className="cute-button mt-1" type="submit" disabled={busy}>
            {busy
              ? "One sec…"
              : mode === "sign-in"
                ? "Come on in"
                : "Join the board"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm underline opacity-75 hover:opacity-100"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "sign-in"
            ? "First time here? Create your account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
