"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { resendVerificationAction } from "@/features/auth/actions";

export function EmailBanner() {
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (hidden) return null;

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationAction();
      setMessage(result.ok ? "Email renvoyé." : (result.formError ?? null));
      setCooldown(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCooldown(false), 60_000); // EF-AUTH-01 CA5: 60 s between sends
    });

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-line bg-surface px-5 py-2.5 text-xs text-fg-2"
    >
      <span className="flex-1">
        {message ?? "Confirme ton email pour pouvoir récupérer ton compte."}
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={pending || cooldown}
        className="min-h-11 px-2 font-semibold text-fg underline disabled:opacity-50"
      >
        Renvoyer
      </button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Masquer"
        className="min-h-11 min-w-11 text-fg"
      >
        ✕
      </button>
    </div>
  );
}
