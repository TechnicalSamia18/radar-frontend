// Fictional sample data for "Try the demo" (docs/ASSUMPTIONS.md A-01).
// Every company here is made up. Dates are relative to "now" so the demo
// always looks current, and it covers every state the app can show.
import type { Company, Opening, Profile, RadarState } from "./schema";
import { STATE_VERSION } from "./schema";

const DAY = 24 * 60 * 60 * 1000;

function iso(now: Date, daysAgo: number) {
  return new Date(now.getTime() - daysAgo * DAY).toISOString();
}
function dateIn(now: Date, days: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(now.getTime() + days * DAY));
}

export function buildDemoState(now: Date): RadarState {
  const profile: Profile = {
    skills: ["JavaScript", "TypeScript", "React", "Tailwind CSS", "Git", "Python", "SQL", "REST APIs"],
    semester: 5,
    graduationYear: 2028,
    cgpa: 3.4,
    cities: ["Islamabad", "Rawalpindi", "Lahore"],
    remotePreference: "any",
    seeking: "internship",
    resumeFileName: "sample-resume.pdf",
    updatedAt: iso(now, 3),
  };

  const company = (id: string, name: string, city: string, status: Company["careersStatus"], extra: Partial<Company> = {}): Company => ({
    id,
    name,
    city,
    website: `https://${id}.example.com`,
    careersUrl: status === "careers_page" ? `https://${id}.example.com/careers` : null,
    hiringEmail: null,
    careersStatus: status,
    lastChecked: iso(now, 0.4),
    failures: 0,
    createdAt: iso(now, 30),
    ...extra,
  });

  const companies: Company[] = [
    company("nimbus", "Nimbus Labs", "Lahore", "careers_page"),
    company("kestrel", "Kestrel Systems", "Islamabad", "email_only", { hiringEmail: "careers@kestrel.example.com" }),
    company("orchid", "Orchid Tech", "Rawalpindi", "careers_page"),
    company("bluefin", "Bluefin Software", "Karachi", "careers_page"),
    company("falcon", "Falcon Digital", "Islamabad", "email_only", { hiringEmail: "hr@falcon.example.com" }),
    company("cedar", "Cedar Apps", "Lahore", "unreachable", { failures: 3 }),
    company("saffron", "Saffron Code", "Islamabad", "blocked"),
    company("indus", "Indus Pixel", "Peshawar", "nothing_found"),
  ];

  const opening = (o: Partial<Opening> & Pick<Opening, "id" | "companyId" | "companyName" | "title">, daysAgo: number): Opening => {
    const status = o.status ?? "saved";
    return {
      type: "internship",
      location: null,
      workMode: null,
      skills: [],
      experienceYears: null,
      graduatesOnly: false,
      minCgpa: null,
      deadline: null,
      deadlineText: null,
      deadlineStatus: "none",
      applyUrl: null,
      applyEmail: null,
      sourceUrl: null,
      adKind: "text",
      rawText: "Sample job post (fictional).",
      notes: "",
      firstSeen: iso(now, daysAgo),
      statusHistory: [{ status: "saved", at: iso(now, daysAgo) }],
      ...o,
      status,
    };
  };

  const openings: Opening[] = [
    opening(
      {
        id: "d1",
        companyId: "nimbus",
        companyName: "Nimbus Labs",
        title: "Frontend Intern (React)",
        location: "Lahore",
        workMode: "hybrid",
        skills: ["JavaScript", "TypeScript", "React", "Git"],
        minCgpa: 3,
        deadline: dateIn(now, 15),
        deadlineText: "Apply by 20th",
        deadlineStatus: "ok",
        applyUrl: "https://nimbus.example.com/careers/frontend-intern",
        sourceUrl: "https://nimbus.example.com/careers",
      },
      1,
    ),
    opening(
      {
        id: "d2",
        companyId: "orchid",
        companyName: "Orchid Tech",
        title: "UI Developer Intern",
        location: "Rawalpindi",
        workMode: "onsite",
        skills: ["React", "Tailwind CSS", "Figma", "JavaScript"],
        deadline: dateIn(now, 9),
        deadlineText: "05/11",
        deadlineStatus: "check",
        applyEmail: "jobs@orchid.example.com",
      },
      2,
    ),
    opening(
      {
        id: "d3",
        companyId: "kestrel",
        companyName: "Kestrel Systems",
        title: "Associate Software Engineer",
        type: "job",
        location: "Islamabad",
        workMode: "onsite",
        skills: ["Node.js", "PostgreSQL", "Docker", "REST APIs"],
        experienceYears: 1,
        graduatesOnly: true,
        applyEmail: "careers@kestrel.example.com",
      },
      3,
    ),
    opening(
      {
        id: "d4",
        companyId: "falcon",
        companyName: "Falcon Digital",
        title: "New post (image ad)",
        type: "unclear",
        adKind: "image",
        sourceUrl: "https://falcon.example.com/posts/hiring",
        rawText: "",
      },
      0,
    ),
    opening(
      {
        id: "d5",
        companyId: "bluefin",
        companyName: "Bluefin Software",
        title: "Python Backend Intern",
        location: "Karachi",
        workMode: "remote",
        skills: ["Python", "FastAPI", "SQL"],
        applyUrl: "https://bluefin.example.com/apply",
        status: "applied",
        statusHistory: [
          { status: "saved", at: iso(now, 12) },
          { status: "applied", at: iso(now, 9) },
        ],
        notes: "Applied through their form. Contact: Sana (HR).",
      },
      12,
    ),
    opening(
      {
        id: "d6",
        companyId: "nimbus",
        companyName: "Nimbus Labs",
        title: "QA Intern",
        location: "Lahore",
        workMode: "onsite",
        skills: ["Manual QA", "Selenium", "SQL"],
        applyUrl: "https://nimbus.example.com/careers/qa-intern",
        status: "interview",
        statusHistory: [
          { status: "saved", at: iso(now, 20) },
          { status: "applied", at: iso(now, 18) },
          { status: "interview", at: iso(now, 4) },
        ],
        notes: "Technical interview on Monday, 11am. Revise SQL joins.",
      },
      20,
    ),
    opening(
      {
        id: "d7",
        companyId: "orchid",
        companyName: "Orchid Tech",
        title: "Summer Intern (Mobile)",
        location: "Rawalpindi",
        skills: ["Flutter", "Dart"],
        deadline: dateIn(now, -6),
        deadlineText: "Last date: 30 Oct",
        deadlineStatus: "past",
        status: "missed",
        statusHistory: [
          { status: "saved", at: iso(now, 25) },
          { status: "missed", at: iso(now, 6) },
        ],
      },
      25,
    ),
  ];

  return { version: STATE_VERSION, profile, companies, openings, isDemo: true, feedLinks: {}, dismissedFeedIds: [] };
}
