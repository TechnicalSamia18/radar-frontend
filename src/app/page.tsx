import Link from "next/link";
import { RadarGraphic } from "@/components/radar-graphic";
import { SiteHeader } from "@/components/site-header";
import { ShieldIcon, UploadIcon } from "@/components/icons";

const STEPS = [
  {
    n: "01",
    title: "Collect",
    body: "Paste any opening you find on a company's careers page. Radar pulls out the role, skills, deadline and how to apply.",
  },
  {
    n: "02",
    title: "Match",
    body: "Compares each opening with your resume and explains what fits, what's missing, and any eligibility catch.",
  },
  {
    n: "03",
    title: "Track",
    body: "Follow every application from saved to offer, with dates, notes and a nudge when it's time to follow up.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="bg-evening text-beige">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:px-10">
          <SiteHeader />

          <div className="mt-16 grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="label-caps text-cloud">For CS students in Pakistan</p>
              <h1 className="mt-6 text-5xl leading-[1.1] font-normal sm:text-6xl">
                Every opening you find,{" "}
                <em className="font-accent text-rose">and exactly how you fit.</em>
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-beige/85">
                Radar reads the internships and jobs you collect from software houses, scores each one against your
                resume, tells you why, and keeps track of every application.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/profile"
                  className="label-caps inline-flex items-center gap-3 bg-sunset px-8 py-4 text-sand transition-colors hover:bg-sunset/85"
                >
                  <UploadIcon /> Upload your resume
                </Link>
                <Link
                  href="/demo"
                  className="label-caps inline-flex items-center border border-beige/70 px-8 py-4 transition-colors hover:bg-beige hover:text-evening"
                >
                  Try the demo
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-cloud">
                <ShieldIcon /> Your resume never leaves your browser. You always apply yourself.
              </p>
            </div>
            <RadarGraphic />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section id="how" className="scroll-mt-6 bg-beige">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <h2 className="label-caps text-sunset">How it works</h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="text-5xl text-stormy" aria-hidden="true">{s.n}</span>
                <h3 className="label-caps mt-4 text-base text-evening">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-stormy">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── About ──────────────────────────────────────── */}
      <section id="about" className="scroll-mt-6 bg-sand">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
          <h2 className="label-caps text-sunset">About</h2>
          <div className="mt-6 grid gap-8 text-stormy md:grid-cols-2">
            <p className="leading-relaxed">
              Openings at smaller Pakistani software houses are scattered across company websites and private groups.
              Radar is a personal tool, built by a CS student, to keep the ones you find in one place and see where
              you stand.
            </p>
            <p className="leading-relaxed">
              Everything runs in your browser: your resume, profile and applications are stored on your device, not on
              a server. Radar never fills in or submits an application for you.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
