"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Loader2, AlertTriangle } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side auth completion page for email links (magic link / recovery).
 *
 * On the Supabase free tier the default email template can't be customised, so
 * the link returns either a `?token_hash`, a `?code`, or an implicit token in
 * the URL hash. A server route can't read the hash, so we finish the sign-in
 * here on the client where the browser Supabase client can establish the
 * session (and persist it to cookies for SSR), then redirect.
 */
function ConfirmInner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function go(next: string) {
      if (cancelled) return;
      router.replace(next);
      router.refresh();
    }

    async function run() {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const next = params.get("next") || "/";

      // Surface explicit errors returned in the hash (e.g. expired link).
      const hashError = hash.get("error_description") || hash.get("error");
      if (hashError) {
        setError(decodeURIComponent(hashError));
        return;
      }

      // 1) token_hash flow (verifyOtp) — works across devices.
      const token_hash = params.get("token_hash");
      const type = params.get("type") as EmailOtpType | null;
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) {
          setError(error.message);
          return;
        }
        go(next);
        return;
      }

      // 2) PKCE code flow.
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        go(next);
        return;
      }

      // 3) Implicit hash flow: the browser client auto-detects the session from
      //    the URL hash on creation. Wait for it to settle.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        go(next);
        return;
      }
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session) go(next);
      });

      // Fallback: if nothing established a session shortly, show guidance.
      setTimeout(async () => {
        if (cancelled) return;
        const { data: again } = await supabase.auth.getSession();
        if (!again.session) {
          setError(
            "Could not complete sign-in. The link may have expired or was opened on a different device. Request a new link, or sign in with your password."
          );
        }
        sub.subscription.unsubscribe();
      }, 4000);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <Car size={28} />
        </div>
        {error ? (
          <>
            <div className="mb-2 flex items-center justify-center gap-2 text-red-400">
              <AlertTriangle size={18} />
              <span className="font-semibold">Sign-in failed</span>
            </div>
            <p className="mb-4 text-sm text-slate-400">{error}</p>
            <a href="/login" className="btn-primary w-full">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-center gap-2 text-slate-200">
              <Loader2 size={18} className="animate-spin" />
              <span className="font-semibold">Signing you in…</span>
            </div>
            <p className="text-sm text-slate-400">One moment.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
