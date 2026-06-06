"use client";

import { useState } from "react";
import { Car, Mail, LogIn, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your inbox for the magic link.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Car size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-100">
            Bezza Observability
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Earnings &amp; vehicle health for your 1.3L
          </p>
        </div>

        <button onClick={signInWithGoogle} className="btn-primary w-full">
          <LogIn size={18} />
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-base-700" />
          OR
          <span className="h-px flex-1 bg-base-700" />
        </div>

        <form onSubmit={signInWithMagicLink} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">
              Email magic link
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-ghost w-full"
          >
            <Mail size={18} />
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {status === "sent" && (
          <p className="mt-4 flex items-center gap-2 text-sm text-brand">
            <CheckCircle2 size={16} />
            {message}
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-sm text-red-400">{message}</p>
        )}
      </div>
    </main>
  );
}
