"use client";
// "Add opening": 1) paste the post → 2) check what Radar read → save.
// Step 2 is an ordinary form; a live fit preview re-reads it on every change.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { DataGate, PageHeader } from "@/components/data-gate";
import { FitBadge } from "@/components/fit-badge";
import { AlertIcon, ImageIcon, XIcon } from "@/components/icons";
import type { RadarState } from "@/lib/data/schema";
import { newId, update } from "@/lib/data/store";
import { extractOpening, MAX_POST_CHARS, type ExtractedOpening } from "@/lib/openings/extract";
import { addOpening, openingFormSchema, openingFormToObject } from "@/lib/openings/form";
import { fitSummary, matchOpening } from "@/lib/openings/match";
import { fieldErrors } from "@/lib/profile/validation";
import { CITIES, MAX_SKILLS } from "@/lib/profile/options";
import { canonicalSkill } from "@/lib/skills/detect";

type Source = { companyName: string; sourceUrl: string; rawText: string; adKind: "text" | "image" };

const EMPTY_EXTRACT: ExtractedOpening = {
  title: null,
  type: "unclear",
  location: null,
  workMode: null,
  skills: [],
  experienceYears: null,
  graduatesOnly: false,
  minCgpa: null,
  deadline: null,
  deadlineText: null,
  deadlineStatus: "none",
  applyEmail: null,
  applyUrl: null,
};

export function AddOpeningView() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader label="Add opening" title="Paste a job post">
        Copy the post from the company&apos;s careers page, email or ad. Radar reads it, then you check the details
        before saving.
      </PageHeader>
      <DataGate>{(state) => <AddOpening state={state} />}</DataGate>
    </div>
  );
}

function AddOpening({ state }: { state: RadarState }) {
  const [source, setSource] = useState<Source | null>(null);
  const [extracted, setExtracted] = useState<ExtractedOpening>(EMPTY_EXTRACT);

  if (!source) {
    return (
      <PasteStep
        companies={state.companies.map((c) => c.name)}
        onRead={(s) => {
          setExtracted(s.adKind === "image" ? EMPTY_EXTRACT : extractOpening(s.rawText));
          setSource(s);
        }}
      />
    );
  }
  return <CheckStep state={state} source={source} extracted={extracted} onBack={() => setSource(null)} />;
}

/* ── Step 1: paste ──────────────────────────────────────────── */

function PasteStep({ companies, onRead }: { companies: string[]; onRead: (s: Source) => void }) {
  const [isImage, setIsImage] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});
  const listId = useId();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s: Source = {
      companyName: String(fd.get("companyName") ?? "").trim(),
      sourceUrl: String(fd.get("sourceUrl") ?? "").trim(),
      rawText: String(fd.get("rawText") ?? ""),
      adKind: isImage ? "image" : "text",
    };
    const errs: Record<string, string> = {};
    if (!s.companyName) errs.companyName = "Add the company's name.";
    if (!isImage && !s.rawText.trim()) errs.rawText = "Paste the job post first.";
    if (s.rawText.length > MAX_POST_CHARS) errs.rawText = "That's very long. Paste just the job description (under 20,000 characters).";
    if (isImage && !/^https?:\/\//i.test(s.sourceUrl)) errs.sourceUrl = "Add the link to the post, starting with https://.";
    setError(errs);
    if (Object.keys(errs).length === 0) onRead(s);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6 border border-line bg-paper p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" error={error.companyName}>
          {(id) => (
            <>
              <input id={id} name="companyName" list={listId} maxLength={120} autoComplete="off" className="input" placeholder="e.g. Nimbus Labs" />
              <datalist id={listId}>{companies.map((c) => <option key={c} value={c} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Link to the post (optional)" error={error.sourceUrl}>
          {(id) => <input id={id} name="sourceUrl" type="url" maxLength={500} className="input" placeholder="https://…" />}
        </Field>
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" checked={isImage} onChange={(e) => setIsImage(e.target.checked)} className="mt-1 accent-sunset" />
        <span>
          <span className="flex items-center gap-2"><ImageIcon /> The job ad is an image or PDF</span>
          <span className="block text-sm text-stormy">Radar won&apos;t try to read it. You&apos;ll add the title yourself and fit will show as unknown.</span>
        </span>
      </label>

      {!isImage && (
        <Field label="Job post" error={error.rawText}>
          {(id) => (
            <textarea
              id={id}
              name="rawText"
              rows={12}
              className="input font-mono text-sm"
              placeholder={"We're hiring: Frontend Intern (React)\nLahore · Hybrid\nApply by 20th Nov: careers@company.pk"}
            />
          )}
        </Field>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="label-caps bg-evening px-8 py-4 text-beige hover:bg-stormy">
          {isImage ? "Continue" : "Read post"}
        </button>
        <Link href="/dashboard" className="label-caps border border-evening px-8 py-4 hover:bg-evening hover:text-beige">
          Cancel
        </Link>
      </div>
    </form>
  );
}

/* ── Step 2: check and save ─────────────────────────────────── */

function CheckStep({ state, source, extracted, onBack }: { state: RadarState; source: Source; extracted: ExtractedOpening; onBack: () => void }) {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>(extracted.skills);
  const [draft, setDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(() => toPreview(extracted, source));
  const ids = { skill: useId() };

  function addSkill() {
    const parts = draft.split(",").map((s) => canonicalSkill(s)).filter(Boolean);
    const lower = new Set(skills.map((s) => s.toLowerCase()));
    const next = [...skills, ...parts.filter((p) => !lower.has(p.toLowerCase()) && lower.add(p.toLowerCase()))].slice(0, MAX_SKILLS);
    setSkills(next);
    setPreview((p) => ({ ...p, skills: next }));
    setDraft("");
  }
  function removeSkill(s: string) {
    const next = skills.filter((x) => x !== s);
    setSkills(next);
    setPreview((p) => ({ ...p, skills: next }));
  }

  // Re-read the whole form on any change, for the live fit preview.
  function onChange(e: FormEvent<HTMLFormElement>) {
    const obj = openingFormToObject(new FormData(e.currentTarget));
    setPreview((p) => ({
      ...p,
      type: (["internship", "job", "unclear"] as const).find((t) => t === obj.type) ?? "unclear",
      location: obj.location || null,
      workMode: (["onsite", "hybrid", "remote"] as const).find((w) => w === obj.workMode) ?? null,
      experienceYears: obj.experienceYears === "" ? null : Number(obj.experienceYears) || 0,
      graduatesOnly: obj.graduatesOnly,
      minCgpa: obj.minCgpa === "" ? null : Number(obj.minCgpa) || null,
      deadlineStatus: !obj.deadline ? (obj.deadlineText ? "check" : "none") : obj.deadlineChecked ? "ok" : "check",
      deadlineText: obj.deadlineText || null,
    }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = openingFormSchema.safeParse(openingFormToObject(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const recordIds = { opening: newId(), company: newId() };
    let savedId = "";
    const result = update((s) => {
      const next = addOpening(s, parsed.data, recordIds, new Date());
      savedId = next.opening.id;
      return next.state;
    });
    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }
    router.push(`/openings/detail?id=${savedId}`);
  }

  const fit = matchOpening(preview, state.profile);
  const notStated = "Not stated in the post";

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
      <form onSubmit={onSubmit} onChange={onChange} noValidate className="space-y-6 border border-line bg-paper p-6">
        <input type="hidden" name="adKind" value={source.adKind} />
        <input type="hidden" name="rawText" value={source.rawText} />
        <input type="hidden" name="sourceUrl" value={source.sourceUrl} />
        {skills.map((s) => <input key={s} type="hidden" name="skills" value={s} />)}

        <div>
          <h2 className="label-caps text-stormy">Check the details</h2>
          <p className="mt-1 text-sm text-stormy">
            {source.adKind === "image"
              ? "Fill in what you can see in the ad. Empty fields are fine."
              : "Radar filled in what it found. Empty fields weren't in the post; leave them empty or add them."}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company" error={errors.companyName}>
            {(id) => <input id={id} name="companyName" defaultValue={source.companyName} maxLength={120} className="input" />}
          </Field>
          <Field label="Title" error={errors.title}>
            {(id) => <input id={id} name="title" defaultValue={extracted.title ?? (source.adKind === "image" ? "New post (image ad)" : "")} maxLength={160} className="input" placeholder={notStated} />}
          </Field>
          <Field label="Type">
            {(id) => (
              <select id={id} name="type" defaultValue={extracted.type} className="input">
                <option value="internship">Internship</option>
                <option value="job">Job</option>
                <option value="unclear">Not clear</option>
              </select>
            )}
          </Field>
          <Field label="City">
            {(id) => (
              <select id={id} name="location" defaultValue={extracted.location ?? ""} className="input">
                <option value="">{notStated}</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <Field label="Work mode">
            {(id) => (
              <select id={id} name="workMode" defaultValue={extracted.workMode ?? ""} className="input">
                <option value="">{notStated}</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            )}
          </Field>
          <Field label="Years of experience" error={errors.experienceYears}>
            {(id) => <input id={id} name="experienceYears" type="number" min={0} max={30} step={1} defaultValue={extracted.experienceYears ?? ""} className="input" placeholder={notStated} />}
          </Field>
          <Field label="Minimum CGPA" error={errors.minCgpa}>
            {(id) => <input id={id} name="minCgpa" type="number" min={0} max={4} step={0.01} defaultValue={extracted.minCgpa ?? ""} className="input" placeholder={notStated} />}
          </Field>
          <label className="flex items-center gap-3 self-end pb-2">
            <input type="checkbox" name="graduatesOnly" defaultChecked={extracted.graduatesOnly} className="accent-sunset" />
            Graduates only
          </label>
        </div>

        {/* Skills */}
        <fieldset>
          <legend className="text-sm text-stormy">Skills asked for</legend>
          {skills.length === 0 ? (
            <p className="mt-2 text-stormy">{notStated}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Skills asked for">
              {skills.map((s) => (
                <li key={s} className="flex items-center gap-1 border border-line bg-sand py-1 pl-3 pr-1">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`} className="p-1 text-stormy hover:text-danger">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <label htmlFor={ids.skill} className="sr-only">Add a skill</label>
            <input
              id={ids.skill}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              maxLength={200}
              placeholder="Add a skill"
              className="input min-w-0 flex-1"
            />
            <button type="button" onClick={addSkill} className="label-caps border border-evening px-4 hover:bg-evening hover:text-beige">Add</button>
          </div>
          {errors.skills && <p className="mt-2 text-sm text-danger">{errors.skills}</p>}
        </fieldset>

        {/* Deadline */}
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Deadline</legend>
          <Field label="Deadline" error={errors.deadline}>
            {(id) => <input id={id} name="deadline" type="date" defaultValue={extracted.deadline ?? ""} className="input" />}
          </Field>
          <div className="self-end pb-2">
            <input type="hidden" name="deadlineText" value={extracted.deadlineText ?? ""} />
            <label className="flex items-center gap-3">
              <input type="checkbox" name="deadlineChecked" defaultChecked={extracted.deadlineStatus === "ok"} className="accent-sunset" />
              I&apos;ve checked this date
            </label>
          </div>
          {extracted.deadlineStatus === "check" && (
            <p className="flex items-start gap-2 text-sm text-danger sm:col-span-2">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              The post says &ldquo;{extracted.deadlineText}&rdquo;, which could mean more than one date. Check it and tick the box.
            </p>
          )}
          {extracted.deadlineStatus === "past" && (
            <p className="flex items-start gap-2 text-sm text-danger sm:col-span-2">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> This deadline has already passed, so the opening will be saved as Missed.
            </p>
          )}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Apply by email" error={errors.applyEmail}>
            {(id) => <input id={id} name="applyEmail" type="email" defaultValue={extracted.applyEmail ?? ""} maxLength={200} className="input" placeholder={notStated} />}
          </Field>
          <Field label="Apply link" error={errors.applyUrl}>
            {(id) => <input id={id} name="applyUrl" type="url" defaultValue={extracted.applyUrl ?? ""} maxLength={500} className="input" placeholder={notStated} />}
          </Field>
        </div>

        {(errors.form || errors.sourceUrl || errors.rawText) && (
          <p role="alert" className="text-danger">{errors.form ?? errors.sourceUrl ?? errors.rawText}</p>
        )}
        {Object.keys(errors).length > 0 && !errors.form && !errors.sourceUrl && !errors.rawText && (
          <p role="alert" className="text-danger">Some fields need fixing. See the messages above.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="label-caps bg-sunset px-8 py-4 text-sand hover:bg-sunset/85">Save opening</button>
          <button type="button" onClick={onBack} className="label-caps border border-evening px-8 py-4 hover:bg-evening hover:text-beige">Back</button>
        </div>
      </form>

      {/* Live preview */}
      <aside aria-label="Fit preview" className="h-fit border border-line bg-paper p-5 lg:sticky lg:top-8">
        <h2 className="label-caps text-stormy">Your fit</h2>
        <div className="mt-3" aria-live="polite">
          <FitBadge fit={fit} />
          {fit.kind === "scored" ? (
            <>
              <p className="mt-3 text-sm">{fitSummary(fit)}</p>
              {fit.warnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-danger">
                  {fit.warnings.map((w) => <li key={w} className="flex gap-2"><AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-stormy">
              {fit.reason}{" "}
              {!state.profile && <Link href="/profile" className="underline">Add your profile</Link>}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function toPreview(e: ExtractedOpening, s: Source) {
  return {
    skills: e.skills,
    type: e.type,
    experienceYears: e.experienceYears,
    graduatesOnly: e.graduatesOnly,
    minCgpa: e.minCgpa,
    location: e.location,
    workMode: e.workMode,
    adKind: s.adKind,
    deadlineStatus: e.deadlineStatus,
    deadlineText: e.deadlineText,
  };
}

/** Label + control + error, wired together with ids for screen readers. */
function Field({ label, error, children }: { label: string; error?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm text-stormy">{label}</label>
      <div className="mt-1">{children(id)}</div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
