"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const TOAST_MS = 3000;
const ToastContext = createContext<(message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

/** Discreet pill at the bottom (mobile) or top right (desktop). The live region stays mounted. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback((next: string) => {
    setMessage(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center lg:inset-x-auto lg:top-6 lg:right-6 lg:bottom-auto"
      >
        {message && (
          <p className="rounded-full bg-fg px-4 py-2.5 text-[13px] font-medium text-white">
            {message}
          </p>
        )}
      </div>
    </ToastContext>
  );
}
