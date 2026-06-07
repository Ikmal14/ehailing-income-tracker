"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Mail, CheckCircle2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setSigningIn(true);
    setStatus("idle");
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setSigningIn(false);
      setStatus("error");
      setMessage(error.message);
      return;
    }
    router.refresh();
    router.push("/");
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/confirm`
      : undefined;

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your inbox for the sign-in link.");
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

        <form onSubmit={signInWithPassword} className="space-y-3">
          <div>
            <label className="label" htmlFor="signin-email">
              Email
            </label>
            <input
              id="signin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="signin-password">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={signingIn}
            className="btn-primary w-full"
          >
            <Lock size={18} />
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-base-700" />
          OR
          <span className="h-px flex-1 bg-base-700" />
        </div>

        <form onSubmit={signInWithMagicLink} className="space-y-3">
          <p className="text-xs text-slate-400">
            Prefer no password? Get a one-time sign-in link by email.
          </p>
          <button
            type="submit"
            disabled={status === "sending" || !email}
            className="btn-ghost w-full"
          >
            <Mail size={18} />
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Open the link on this same device for the smoothest sign-in.
          </p>
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
