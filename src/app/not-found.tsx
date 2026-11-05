import Link from "next/link";
import { RadarMark } from "@/components/icons";

export const metadata = { title: "Page not found — Radar" };

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-evening px-6 py-20 text-beige">
      <div className="max-w-md text-center">
        <RadarMark className="mx-auto h-10 w-10 text-rose" />
        <p className="label-caps mt-6 text-cloud">404</p>
        <h1 className="mt-3 text-3xl font-normal">Nothing on the radar here</h1>
        <p className="mt-4 text-beige/80">This page doesn&apos;t exist. It may have moved, or the link has a typo.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="label-caps bg-sunset px-6 py-3 text-sand hover:bg-sunset/85">Dashboard</Link>
          <Link href="/" className="label-caps border border-beige/70 px-6 py-3 hover:bg-beige hover:text-evening">Home</Link>
        </div>
      </div>
    </main>
  );
}
