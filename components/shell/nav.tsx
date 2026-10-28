"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Home, Inbox, Target, Timer, BarChart3 } from "lucide-react";
import { cn } from "@/lib/ui/cn";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/drill", label: "Drill", icon: Target },
  { href: "/test", label: "Test", icon: Timer },
  { href: "/review", label: "Review", icon: Inbox },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/plan", label: "Plan", icon: CalendarDays },
];

export function SideNav({ signOut = false }: { signOut?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-line md:p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="inline-block h-7 w-7 rounded-md bg-accent" aria-hidden />
        <span className="text-lg font-semibold tracking-tight">Apex LSAT</span>
      </Link>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "focus-ring flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-bg-sunken hover:text-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      {signOut && (
        <a href="/auth/signout" className="focus-ring mt-auto px-3 py-2 text-xs text-ink-3 hover:text-ink">
          Sign out
        </a>
      )}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  const compact = items.filter((i) => ["/", "/learn", "/drill", "/review", "/plan"].includes(i.href));
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg-elev/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {compact.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-accent" : "text-ink-3",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
