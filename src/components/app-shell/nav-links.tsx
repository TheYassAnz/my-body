"use client";

import { ChartLine, House, PersonStanding, Settings, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/accueil", label: "Accueil", Icon: House },
  { href: "/progres", label: "Progrès", Icon: ChartLine },
  { href: "/corps", label: "Corps", Icon: PersonStanding },
  { href: "/objectif", label: "Objectif", Icon: Target },
] as const;

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function SideNav() {
  const pathname = usePathname();
  const all = [...items, { href: "/reglages", label: "Réglages", Icon: Settings }] as const;
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {all.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] font-medium ${active ? "bg-surface font-semibold text-fg" : "text-muted"}`}
          >
            <Icon size={18} strokeWidth={1.7} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-bg px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {items.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 min-w-11 flex-col items-center gap-1 text-[10px] ${active ? "text-fg" : "text-subtle"}`}
          >
            <Icon size={22} strokeWidth={1.7} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
