import { SiteFooter, SiteHero } from "@/components/site-header";

export const metadata = { title: "About — Radar" };

const PROMISES = [
  ["Your data stays with you", "Your resume, profile and applications are saved in this browser only. There's no account and no server copy. Clear it any time."],
  ["You always apply yourself", "Radar opens the real application or your email app. It never fills in a form or sends anything in your name."],
  ["It never guesses", "If a post doesn't state something, Radar says so. Unclear dates are flagged instead of trusted."],
  ["Polite checking", "Once a day per company, robots.txt respected, an honest name in every request, and no LinkedIn, Facebook or WhatsApp."],
];

export default function AboutPage() {
  return (
    <main className="flex flex-1 flex-col">
      <SiteHero label="About" title="A personal tool for" accent="a scattered job market." />
      <section className="bg-sand">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:px-10 md:grid-cols-2">
          <p className="text-lg leading-relaxed text-evening">
            Internships and entry-level roles at smaller Pakistani software houses are spread across company websites,
            emails and private groups. Students without the right network or group memberships often never see them,
            or lose track of where they applied.
          </p>
          <p className="leading-relaxed text-stormy">
            Radar was built by a CS student to find those openings, see honestly where you stand, and follow up on time.
            A small free job checks companies every morning; everything about you stays in your browser. It covers the
            companies that publish their jobs openly, and you can paste the rest.
          </p>
        </div>
      </section>
      <section className="flex-1 bg-beige">
        <ul className="mx-auto grid max-w-6xl gap-px bg-line px-0 sm:grid-cols-2">
          {PROMISES.map(([title, body]) => (
            <li key={title} className="bg-beige px-6 py-10 sm:px-10">
              <h2 className="label-caps text-base text-sunset">{title}</h2>
              <p className="mt-3 leading-relaxed text-stormy">{body}</p>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </main>
  );
}
