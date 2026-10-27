import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function Callout({ tone = "info", title, children }: { tone?: "info" | "warn" | "ok" | "accent"; title?: string; children: ReactNode }) {
  const cls = { info: "border-info bg-info-soft text-info", warn: "border-warn bg-warn-soft text-warn", ok: "border-ok bg-ok-soft text-ok", accent: "border-accent bg-accent-soft text-accent" }[tone];
  return (
    <div className={cn("my-4 rounded-[var(--radius)] border-l-4 px-4 py-3 text-sm [&_p]:my-1 [&_p]:text-current", cls)}>
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function KeyIdea({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 rounded-[var(--radius)] border border-accent bg-accent-soft/60 px-4 py-3 text-[15px] font-medium leading-7 text-accent [&_p]:my-0 [&_p]:text-current">
      {children}
    </div>
  );
}

export function Example({ label = "Example", children }: { label?: string; children: ReactNode }) {
  return (
    <div className="my-4 rounded-[var(--radius)] border border-line bg-bg-elev p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <div className="lsat-text [&_p]:my-2">{children}</div>
    </div>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="my-4 space-y-2 [&>ol]:list-none [&>ol]:pl-0 [&>ol>li]:relative [&>ol>li]:rounded-md [&>ol>li]:border [&>ol>li]:border-line [&>ol>li]:px-4 [&>ol>li]:py-2.5">{children}</div>;
}
