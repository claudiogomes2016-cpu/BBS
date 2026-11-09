"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { MODULES } from "@/lib/nav";
import { Brand } from "@/components/Brand";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-0.5">
      {MODULES.map((m, i) => {
        const href = `/${m.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = m.icon;
        return (
          <Link
            key={m.slug}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition",
              active ? "bg-accent/15 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted group-hover:text-ink-2")} aria-hidden />
            <span className="flex-1 truncate">
              <span className="mr-1.5 text-[11px] text-muted tabular">{i + 1}.</span>
              {m.title}
            </span>
            {!m.live && <span className="text-[10px] text-muted">P{m.phase}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <NavList />
        </div>
      </aside>
  );
}

/** Hamburger + drawer, rendered inside the top bar on small screens. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface">
            <div className="flex items-center justify-between px-5 py-5">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-ink-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
