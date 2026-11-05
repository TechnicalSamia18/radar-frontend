import { SiteFooter, SiteHero } from "@/components/site-header";

export const metadata = { title: "About — Radar" };

const PROMISES = [
  ["Your data stays with you", "Your resume, profile and applications are saved in this browser only. There's no account and no server copy. Clear it any time."],
  ["You always apply yourself", "Radar opens the real application or your email app. It never fills in a form or sends anything in your name."],
  ["It never guesses", "If a post doesn't state something, Radar says so. Unclear dates are flagged instead of trusted."],
  ["No scraping", "No LinkedIn, Facebook or WhatsApp. You bring the openings; Radar helps you judge and track them."],
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
            Radar was built by a CS student to keep every opening in one place, see honestly where they stand, and
            follow up on time. This version runs entirely in the browser. A later version may also find companies and
            check their careers pages automatically.
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
