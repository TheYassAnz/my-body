import { User } from "lucide-react";
import Link from "next/link";
import { NewWeightButton } from "@/features/weight/components/new-weight-button";
import { formatLongDate, type LocalDate } from "@/lib/dates";

export function HomeHeader({ date }: { date: LocalDate }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-fg-2">{formatLongDate(date)}</p>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Bonjour</h1>
      </div>
      <NewWeightButton className="hidden lg:inline-flex" />
      <Link
        href="/reglages"
        aria-label="Réglages"
        className="flex size-11 items-center justify-center rounded-full border border-line text-fg lg:hidden"
      >
        <User size={20} strokeWidth={1.7} aria-hidden />
      </Link>
    </header>
  );
}
