import type { HTMLAttributes } from "react";

/** Warning box for recoverable errors (not destructive: --danger stays for deletions). */
export function Alert({ className = "", ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      {...rest}
      className={`rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn ${className}`}
    />
  );
}
