export function OnboardingProgress({ step, total }: { step: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progression de l'inscription"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      className="h-[3px] w-full rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-fg" style={{ width: `${(step / total) * 100}%` }} />
    </div>
  );
}
