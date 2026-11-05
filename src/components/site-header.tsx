"use client";
// Header for the public pages (home, how it works, about).
// Desktop: logo + links with an animated underline + Dashboard button; the
// current page keeps its underline. Phones: a menu button that opens a panel.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { MenuIcon, RadarMark, XIcon } from "@/components/icons";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

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
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`label-caps group relative py-2 transition-colors hover:text-beige ${active ? "text-beige" : "text-cloud"}`}
              >
                {l.label}
                {/* underline that grows from the left on hover/focus; stays on the current page */}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-rose transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100 ${active ? "scale-x-100" : "scale-x-0"}`}
                />
              </Link>
            );
          })}
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

      <nav id={panelId} aria-label="Main" hidden={!open} className="absolute inset-x-0 top-full z-20 mt-4 border border-stormy bg-evening p-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            aria-current={pathname === l.href ? "page" : undefined}
            className={`label-caps block border-l-2 px-4 py-4 hover:bg-stormy hover:text-beige ${pathname === l.href ? "border-rose text-beige" : "border-transparent text-cloud"}`}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/dashboard" onClick={() => setOpen(false)} className="label-caps mt-2 block bg-beige px-4 py-4 text-center text-evening">
          Dashboard
        </Link>
      </nav>
    </header>
  );
}

/** Navy band with the header and a page title, used by the inner public pages. */
export function SiteHero({ label, title, accent }: { label: string; title: string; accent?: string }) {
  return (
    <section className="bg-evening text-beige">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <SiteHeader />
        <p className="label-caps mt-16 text-cloud">{label}</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-normal sm:text-5xl">
          {title} {accent && <em className="font-accent text-rose">{accent}</em>}
        </h1>
      </div>
    </section>
  );
}

/** Small footer shared by the public pages. */
export function SiteFooter() {
  return (
    <footer className="bg-evening text-cloud">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm sm:px-10">
        <p>Radar · a student project. Openings checked daily; your data stays in your browser.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/how-it-works" className="hover:text-beige">How it works</Link>
          <Link href="/about" className="hover:text-beige">About</Link>
          <Link href="/live" className="hover:text-beige">Today&apos;s openings</Link>
        </nav>
      </div>
    </footer>
  );
}
