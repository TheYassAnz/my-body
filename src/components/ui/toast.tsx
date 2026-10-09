"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const TOAST_MS = 3000;
export type ToastOptions = {
  action?: { label: string; onClick: () => void };
  durationMs?: number;
};
type Show = (message: string, opts?: ToastOptions) => void;
const ToastContext = createContext<Show>(() => {});

export const useToast = () => useContext(ToastContext);

/** Discreet pill at the bottom (mobile) or top right (desktop). The live region stays mounted. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<{ text: string; action?: ToastOptions["action"] } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback<Show>((text, opts) => {
    setMessage({ text, action: opts?.action });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), opts?.durationMs ?? TOAST_MS);
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
          <div className="flex items-center gap-3 rounded-full bg-fg px-4 py-2.5 text-[13px] font-medium text-white">
            <p>{message.text}</p>
            {message.action && (
              <button
                type="button"
                onClick={() => {
                  clearTimeout(timer.current);
                  setMessage(null);
                  message.action?.onClick();
                }}
                className="pointer-events-auto -my-2.5 -mr-4 min-h-11 rounded-full px-4 font-semibold underline"
              >
                {message.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}
