import Link from "next/link";
import { SiteFooter, SiteHero } from "@/components/site-header";

export const metadata = { title: "How it works — Radar" };

const STEPS = [
  {
    n: "01",
    title: "Collect",
    body: "Paste any opening you find: from a company's careers page, an email, or a post someone shared. Radar pulls out the role, internship or job, city, work mode, skills, experience, CGPA, deadline and how to apply.",
    detail: "Anything the post doesn't say stays empty and shows as “Not stated”. Dates that could mean two things, like 05/11, are flagged for you to check. Image-only ads are saved with their link, and Radar doesn't pretend to read them.",
  },
  {
    n: "02",
    title: "Match",
    body: "Upload your resume once. It's read in your browser, never uploaded, and you confirm the skills it finds. Each opening then gets a fit score with the reasons: what you have, what's missing.",
    detail: "Eligibility warnings are one line each: graduates only, a minimum CGPA, years of experience, a city you didn't pick. A warning never hides an opening; you decide.",
  },
  {
    n: "03",
    title: "Track",
    body: "Open the real application or your email app with one click: Radar never applies for you. Then move each opening from Saved to Applied, Interview and Offer or Rejected.",
    detail: "Every change is dated. Notes keep contacts and interview prep together, and Radar nudges you when an application has had no update for a week. Export everything to a spreadsheet at any time.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHero label="How it works" title="Three steps," accent="no scraping, no bots." />
      <section className="flex-1 bg-beige">
        <ol className="mx-auto max-w-6xl divide-y divide-line px-6 sm:px-10">
          {STEPS.map((s) => (
            <li key={s.n} className="grid gap-6 py-12 md:grid-cols-[8rem_1fr_1fr]">
              <span className="text-6xl text-stormy" aria-hidden="true">{s.n}</span>
              <div>
                <h2 className="label-caps text-base text-evening">{s.title}</h2>
                <p className="mt-3 text-lg leading-relaxed text-evening">{s.body}</p>
              </div>
              <p className="leading-relaxed text-stormy md:pt-8">{s.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-6 pb-16 sm:px-10">
          <Link href="/demo" className="label-caps bg-sunset px-8 py-4 text-sand hover:bg-sunset/85">Try the demo</Link>
          <Link href="/openings/new" className="label-caps border border-evening px-8 py-4 hover:bg-evening hover:text-beige">Add your first opening</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
