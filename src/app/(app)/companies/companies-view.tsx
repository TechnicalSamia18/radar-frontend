"use client";
// Companies (PRD screen 4): list with careers-source status, add by hand,
// edit (incl. your own careers link, REQ-013), remove, and CSV import.
import { useRef, useState, type FormEvent } from "react";
import { companyStatus, TONE_CLASS } from "@/lib/companies/status";
import { DataGate, PageHeader } from "@/components/data-gate";
import { Field } from "@/components/field";
import { AlertIcon, CheckIcon, DownloadIcon, ExternalIcon, PlusIcon, UploadIcon } from "@/components/icons";
import { CSV_TEMPLATE, importCompanies, MAX_IMPORT_BYTES, type ImportReport } from "@/lib/companies/csv";
import { companiesCsv, downloadText } from "@/lib/openings/export";
import { addCompany, companyFormSchema, companyFormToObject, findDuplicate, removeCompany, updateCompany } from "@/lib/companies/form";
import type { Company, RadarState } from "@/lib/data/schema";
import { newId, update } from "@/lib/data/store";
import { fieldErrors } from "@/lib/profile/validation";

const STATUS_OPTIONS: Array<[Company["careersStatus"], string]> = [
  ["careers_page", "Careers page"],
  ["email_only", "Email only"],
  ["nothing_found", "No careers info"],
  ["unreachable", "Couldn't reach site"],
  ["blocked", "Doesn't allow automated checks"],
  ["not_checked", "Not checked yet"],
];

export function CompaniesView() {
  return (
    <div className="mx-auto max-w-5xl">
      <DataGate>{(state) => <Companies state={state} />}</DataGate>
    </div>
  );
}

function Companies({ state }: { state: RadarState }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...state.companies].sort((a, b) => a.name.localeCompare(b.name));
  const openCount = (id: string) => state.openings.filter((o) => o.companyId === id && o.status === "saved").length;

  async function onImport(file: File | undefined) {
    setReport(null);
    setImportError(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setImportError("That file is over 1 MB. Split it into smaller files.");
    const result = importCompanies(state, await file.text(), new Date(), newId);
    if ("error" in result) return setImportError(result.error);
    const saved = update(() => result.state);
    if (!saved.ok) return setImportError(saved.message);
    setReport(result.report);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "radar-companies-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  function remove(c: Company) {
    const n = state.openings.filter((o) => o.companyId === c.id).length;
    const msg = n ? `Remove ${c.name}? Its ${n} opening${n === 1 ? "" : "s"} will stay in your list.` : `Remove ${c.name}?`;
    if (!window.confirm(msg)) return;
    const r = update((s) => removeCompany(s, c.id));
    setNotice(r.ok ? `${c.name} removed.` : r.message);
  }

  return (
    <>
      <PageHeader
        label="Companies"
        title="Software houses you're watching"
        action={
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => { setAdding(true); setEditing(null); }} className="label-caps inline-flex items-center gap-2 bg-sunset px-5 py-3 text-sand hover:bg-sunset/85">
              <PlusIcon /> Add company
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="label-caps inline-flex items-center gap-2 border border-evening px-5 py-3 hover:bg-evening hover:text-beige">
              <UploadIcon /> Import CSV
            </button>
            <button
              type="button"
              disabled={state.companies.length === 0}
              onClick={() => downloadText(companiesCsv(state), `radar-companies-${new Date().toISOString().slice(0, 10)}.csv`)}
              className="label-caps inline-flex items-center gap-2 border border-evening px-5 py-3 hover:bg-evening hover:text-beige disabled:opacity-50"
            >
              <DownloadIcon /> Export CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Import companies from a CSV file" onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
        }
      >
        Companies are added automatically when you save an opening. You can also add them by hand or import a list
        (for example one you exported from a directory).{" "}
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1 text-evening underline">
          <DownloadIcon /> CSV template
        </button>
      </PageHeader>

      <div aria-live="polite" className="mt-6 space-y-4">
        {notice && <p className="flex items-center gap-2 text-evening"><CheckIcon className="text-sunset" /> {notice}</p>}
        {importError && <p role="alert" className="flex items-start gap-2 text-danger"><AlertIcon className="mt-0.5 h-4 w-4 shrink-0" /> {importError}</p>}
        {report && <ImportResult report={report} onClose={() => setReport(null)} />}
      </div>

      {adding && (
        <CompanyForm
          state={state}
          onCancel={() => setAdding(false)}
          onSaved={(name) => { setAdding(false); setNotice(`${name} added.`); }}
        />
      )}

      {sorted.length === 0 && !adding ? (
        <div className="mt-8 border border-dashed border-cloud bg-paper p-8">
          <h2 className="text-2xl font-normal">No companies yet</h2>
          <p className="mt-2 max-w-xl text-stormy">Add the software houses you want to keep an eye on, or import a CSV with a name column.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line border border-line bg-paper">
          {sorted.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="p-2">
                <CompanyForm state={state} company={c} onCancel={() => setEditing(null)} onSaved={(name) => { setEditing(null); setNotice(`${name} updated.`); }} />
              </li>
            ) : (
              <CompanyRow key={c.id} company={c} open={openCount(c.id)} onEdit={() => { setEditing(c.id); setAdding(false); }} onRemove={() => remove(c)} />
            ),
          )}
        </ul>
      )}
    </>
  );
}

function CompanyRow({ company: c, open, onEdit, onRemove }: { company: Company; open: number; onEdit: () => void; onRemove: () => void }) {
  const st = companyStatus(c);
  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-lg">
          {c.name}
          {c.city && <span className="text-stormy"> · {c.city}</span>}
        </p>
        <p className={`text-sm ${TONE_CLASS[st.tone]}`}>
          {st.text}
          {open > 0 && <span className="text-sunset"> · {open} open opening{open === 1 ? "" : "s"}</span>}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Website <ExternalIcon className="h-3 w-3" /></a>}
          {c.careersUrl && <a href={c.careersUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Careers <ExternalIcon className="h-3 w-3" /></a>}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="label-caps border border-evening px-4 py-2 hover:bg-evening hover:text-beige" aria-label={`Edit ${c.name}`}>Edit</button>
        <button type="button" onClick={onRemove} className="label-caps border border-line px-4 py-2 text-danger hover:border-danger" aria-label={`Remove ${c.name}`}>Remove</button>
      </div>
    </li>
  );
}

function CompanyForm({ state, company, onCancel, onSaved }: { state: RadarState; company?: Company; onCancel: () => void; onSaved: (name: string) => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = companyFormSchema.safeParse(companyFormToObject(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    const dup = findDuplicate(state, parsed.data, company?.id);
    if (dup) return setErrors({ [dup.field]: dup.message });
    const r = update((s) => (company ? updateCompany(s, company.id, parsed.data) : addCompany(s, parsed.data, newId(), new Date())));
    if (!r.ok) return setErrors({ form: r.message });
    onSaved(parsed.data.name);
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`${company ? "" : "mt-8 border border-line"} space-y-5 bg-paper p-5`} aria-label={company ? `Edit ${company.name}` : "Add company"}>
      <h2 className="label-caps text-stormy">{company ? `Edit ${company.name}` : "Add a company"}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>{(id, d) => <input id={id} aria-describedby={d} name="name" defaultValue={company?.name} maxLength={120} className="input" aria-invalid={!!errors.name || undefined} />}</Field>
        <Field label="City (optional)">{(id) => <input id={id} name="city" defaultValue={company?.city ?? ""} maxLength={60} className="input" />}</Field>
        <Field label="Website (optional)" error={errors.website}>{(id, d) => <input id={id} aria-describedby={d} name="website" type="url" defaultValue={company?.website ?? ""} placeholder="https://…" className="input" aria-invalid={!!errors.website || undefined} />}</Field>
        <Field label="Careers page (optional)" error={errors.careersUrl} hint="Your link is kept as is: Radar never replaces it.">
          {(id, d) => <input id={id} aria-describedby={d} name="careersUrl" type="url" defaultValue={company?.careersUrl ?? ""} placeholder="https://…/careers" className="input" aria-invalid={!!errors.careersUrl || undefined} />}
        </Field>
        <Field label="Hiring email (optional)" error={errors.hiringEmail}>{(id, d) => <input id={id} aria-describedby={d} name="hiringEmail" type="email" defaultValue={company?.hiringEmail ?? ""} className="input" aria-invalid={!!errors.hiringEmail || undefined} />}</Field>
        <Field label="Careers source">
          {(id) => (
            <select id={id} name="careersStatus" defaultValue={company?.careersStatus ?? "not_checked"} className="input">
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          )}
        </Field>
      </div>
      {errors.form && <p role="alert" className="text-danger">{errors.form}</p>}
      <div className="flex gap-3">
        <button type="submit" className="label-caps bg-evening px-6 py-3 text-beige hover:bg-stormy">{company ? "Save changes" : "Add company"}</button>
        <button type="button" onClick={onCancel} className="label-caps border border-evening px-6 py-3 hover:bg-evening hover:text-beige">Cancel</button>
      </div>
    </form>
  );
}

function ImportResult({ report, onClose }: { report: ImportReport; onClose: () => void }) {
  return (
    <section aria-label="Import result" className="border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="flex items-center gap-2 text-lg"><CheckIcon className="h-5 w-5 text-sunset" /> Imported {report.added} compan{report.added === 1 ? "y" : "ies"}.</p>
        <button type="button" onClick={onClose} className="text-sm underline">Close</button>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-stormy">
        {report.duplicates.length > 0 && <li>Skipped {report.duplicates.length} already in your list: {report.duplicates.slice(0, 8).join(", ")}{report.duplicates.length > 8 ? "…" : ""}</li>}
        {report.filtered.length > 0 && <li>Left out {report.filtered.length} that aren&apos;t software houses (BPO, call centre or marketing only): {report.filtered.slice(0, 8).join(", ")}{report.filtered.length > 8 ? "…" : ""}</li>}
      </ul>
      {report.failed.length > 0 && (
        <div className="mt-3">
          <p className="text-sm text-danger">{report.failed.length} row{report.failed.length === 1 ? "" : "s"} couldn&apos;t be imported:</p>
          <ul className="mt-1 max-h-48 overflow-auto text-sm text-danger">
            {report.failed.map((f) => <li key={f.row}>Row {f.row}: {f.reason}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
