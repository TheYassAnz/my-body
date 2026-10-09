import { useId } from "react";

type Option = readonly [value: string, label: string];

/** Native radios: keyboard and screen readers for free. The visible control is the label. */
export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  error,
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  defaultValue: string | undefined;
  error?: string;
}) {
  const errorId = useId();
  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="text-xs font-medium text-fg-2">{legend}</legend>
      <div className="flex gap-2">
        {options.map(([value, label]) => (
          <label
            key={value}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-sm has-[:checked]:border-fg has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={value === defaultValue}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-fg">
          {error}
        </p>
      )}
    </fieldset>
  );
}
