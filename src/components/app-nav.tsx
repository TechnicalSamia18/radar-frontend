"use client";
// Navigation for the app pages.
// Desktop (md+): fixed navy sidebar. Phones: a top bar with a menu button.
// The current page is marked with aria-current="page" and a rose bar.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { BuildingIcon, GridIcon, ListIcon, MenuIcon, PlusIcon, RadarMark, UserIcon, XIcon } from "@/components/icons";

const NAV: Array<{ href: string; label: string; icon: ReactNode }> = [
  { href: "/dashboard", label: "Dashboard", icon: <GridIcon /> },
  { href: "/live", label: "Live openings", icon: <RadarMark className="h-4 w-4" /> },
  { href: "/openings", label: "My openings", icon: <ListIcon /> },
  { href: "/companies", label: "Companies", icon: <BuildingIcon /> },
  { href: "/profile", label: "Profile", icon: <UserIcon /> },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 border-l-2 px-4 py-3 transition-colors ${
                active ? "border-rose bg-stormy text-beige" : "border-transparent text-cloud hover:bg-stormy/40 hover:text-beige"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function AddOpeningButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/openings/new"
      onClick={onNavigate}
      className="label-caps flex items-center justify-center gap-2 bg-sunset px-4 py-3 text-sand transition-colors hover:bg-sunset/85"
    >
      <PlusIcon /> Add opening
    </Link>
  );
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3 text-lg font-normal tracking-[0.3em] text-beige">
      <RadarMark className="h-5 w-5 text-rose transition-transform duration-500 group-hover:rotate-90" />
      RADAR
    </Link>
  );
}

export function AppNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Close the phone menu with Escape. (Menu links close it themselves when clicked.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden bg-evening md:block md:w-64 md:shrink-0">
        <div className="sticky top-0 flex h-screen flex-col px-6 py-8">
          <Logo />
          <nav aria-label="App" className="mt-10">
            <NavItems />
          </nav>
          <div className="mt-8">
            <AddOpeningButton />
          </div>
          <p className="mt-auto text-xs leading-relaxed text-cloud">
            Your data stays in this browser.{" "}
            <a href="https://github.com/TechnicalSamia18/radar-frontend" target="_blank" rel="noopener noreferrer" className="underline hover:text-beige">
              Source code<span className="sr-only"> (opens GitHub in a new tab)</span>
            </a>
          </p>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="relative z-20 bg-evening px-5 py-4 md:hidden">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            className="p-2 text-beige"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
        <nav id={panelId} aria-label="App" hidden={!open} className="absolute inset-x-0 top-full border-t border-stormy bg-evening px-3 pb-4 pt-2">
          <NavItems onNavigate={() => setOpen(false)} />
          <div className="mt-3 px-1">
            <AddOpeningButton onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </header>
    </>
  );
}
