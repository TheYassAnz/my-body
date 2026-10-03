import type { ReactNode } from "react";

export function Checkbox({
  name,
  label,
  error,
}: {
  name: string;
  label: ReactNode;
  error?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 text-[13px] leading-snug text-fg-2">
        <input
          type="checkbox"
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-5 shrink-0 accent-fg"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className="pl-8 text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </div>
  );
}
