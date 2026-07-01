"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-col gap-px">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-sm border-l-[3px] border-transparent px-3 py-[10px] text-[13px] tracking-[0.02em] transition-colors",
              active
                ? "border-l-clay bg-white/[0.11] text-white"
                : "text-[#d7dace] hover:bg-white/[0.07]",
            )}
          >
            <Icon size={16} strokeWidth={1.8} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.13] px-2 pb-[18px] pt-[6px]">
        <Image
          src="/logo-horizontal-cream.png"
          alt="Tu Decoración Original"
          width={150}
          height={86}
          priority
          className="w-[150px]"
        />
        <small className="mt-2 block text-[9px] uppercase tracking-[3px] text-[#c7cbb8]">
          TDO Manager
        </small>
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto border-t border-white/[0.13] pt-[14px] text-[11px] text-[#aeb2a1]">
        Sesión: <b className="text-cream">Sarmi</b>
        <br />
        Socio · 40 %
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const title = NAV.find((n) =>
    n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
  )?.label ?? "TDO Manager";

  return (
    <div className="min-h-screen md:grid md:grid-cols-[238px_1fr]">
      {/* Sidebar fijo en escritorio */}
      <aside className="hidden bg-sage px-[14px] py-[22px] text-cream md:flex md:flex-col">
        <SidebarInner />
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-sage px-[14px] py-[22px] text-cream shadow-md">
            <SidebarInner onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white px-5 py-[15px] md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-sm p-1 text-ink-muted hover:bg-beige-warm md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="font-display text-[24px] font-normal">{title}</h1>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-ink-muted">
            <span className="hidden sm:inline">Sarmi</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-[13px] font-semibold text-cream">
              S
            </span>
          </div>
        </header>

        <main className="max-w-container px-5 py-6 md:px-7">{children}</main>
      </div>
    </div>
  );
}
