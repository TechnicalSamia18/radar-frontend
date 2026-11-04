"use client";
// Landing-page header. Desktop: logo + links with an animated underline + a
// Dashboard button. Phones: a menu button that opens a full-width panel.
// Client component because the phone menu has open/closed state.
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { MenuIcon, RadarMark, XIcon } from "@/components/icons";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Close the phone menu with Escape (keyboard users).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative">
      <div className="flex items-center justify-between gap-6">
        <Link href="/" className="group flex items-center gap-3 text-xl font-normal tracking-[0.3em]">
          <RadarMark className="h-6 w-6 text-rose transition-transform duration-500 group-hover:rotate-90" />
          RADAR
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-10 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="label-caps group relative py-2 text-cloud transition-colors hover:text-beige">
              {l.label}
              {/* underline that grows from the left on hover/focus */}
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-rose transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </a>
          ))}
          <Link
            href="/dashboard"
            className="label-caps border border-beige/80 px-5 py-3 transition-colors hover:border-beige hover:bg-beige hover:text-evening"
          >
            Dashboard
          </Link>
        </nav>

        <button
          type="button"
          className="p-2 text-beige md:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full z-20 mt-4 border border-stormy bg-evening p-2 md:hidden"
      >
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="label-caps block px-4 py-4 text-cloud hover:bg-stormy hover:text-beige">
            {l.label}
          </a>
        ))}
        <Link href="/dashboard" className="label-caps mt-2 block bg-beige px-4 py-4 text-center text-evening">
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
