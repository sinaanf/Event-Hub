import { useState } from "react";
import { addToPipeline } from "@/lib/pipeline";
import { getAccessToken } from "@/context/AuthContext";

type Prospect = {
  company_name: string;
  reason: string;
  contact_role: string;
  company_size?: string;
  why_now?: string;
  sponsorship_angle?: string;
};

type ContactPerson = {
  full_name: string;
  title: string;
  email: string;
  linkedin_url: string;
  company: string;
};

type ContactResult = {
  status: "found" | "not_found";
  contacts?: ContactPerson[];
};

type ProspectState = {
  status: "idle" | "approved" | "skipped";
  emailSubject: string;
  email: string;
  emailLoading: boolean;
  emailGenerated: boolean;
  copied: boolean;
  contactLoading: boolean;
  contact: ContactResult | null;
  savedToPipeline: boolean;
};

function getSenderName(): string {
  try {
    const raw = localStorage.getItem("sinoo_profile");
    if (raw) return JSON.parse(raw).fullName || "";
  } catch {}
  return "";
}

function getCompanyProfile(): { orgName: string; packages: string } {
  try {
    const raw = localStorage.getItem("sinooprofile");
    if (raw) {
      const p = JSON.parse(raw);
      return { orgName: p.orgName || "", packages: p.packages || "" };
    }
  } catch {}
  return { orgName: "", packages: "" };
}

function apiHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ContactCard({ contact }: { contact: ContactPerson }) {
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(contact.email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:border-[hsl(243,75%,80%)] hover:bg-[hsl(243,75%,98%)] transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{contact.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
        {contact.email && (
          <div className="flex items-center gap-2 mt-1">
            <a href={`mailto:${contact.email}`} className="text-xs text-[hsl(243,75%,50%)] hover:underline truncate">
              {contact.email}
            </a>
            <button
              onClick={copyEmail}
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-muted-foreground hover:bg-white hover:border-[hsl(243,75%,70%)] hover:text-[hsl(243,75%,50%)] transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
      {contact.linkedin_url && (
        <a
          href={contact.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#0077B5] text-white hover:bg-[#006097] transition-colors shrink-0"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
          LinkedIn
        </a>
      )}
    </div>
  );
}

function ProspectCard({
  prospect,
  session_title,
  value_prop,
  eventName,
}: {
  prospect: Prospect;
  session_title: string;
  value_prop: string;
  eventName: string;
}) {
  const [state, setState] = useState<ProspectState>({
    status: "idle",
    emailSubject: "",
    email: "",
    emailLoading: false,
    emailGenerated: false,
    copied: false,
    contactLoading: false,
    contact: null,
    savedToPipeline: false,
  });

  function skip() {
    setState((s) => ({ ...s, status: "skipped" }));
  }

  async function approve() {
    setState((s) => ({ ...s, status: "approved", emailLoading: true }));
    const cp = getCompanyProfile();
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          company_name: prospect.company_name,
          contact_role: prospect.contact_role,
          reason: prospect.reason,
          session_title,
          value_prop,
          eventName,
          sender_name: getSenderName(),
          org_name: cp.orgName || undefined,
          packages: cp.packages || undefined,
        }),
      });
      const data = await res.json();
      setState((s) => ({
        ...s,
        emailLoading: false,
        emailGenerated: true,
        emailSubject: data.subject || "",
        email: data.email || "",
      }));
    } catch {
      setState((s) => ({ ...s, emailLoading: false, emailGenerated: true, emailSubject: "", email: "" }));
    }
  }

  function copyEmail() {
    const text = state.emailSubject ? `Subject: ${state.emailSubject}\n\n${state.email}` : state.email;
    navigator.clipboard.writeText(text).then(() => {
      setState((s) => ({ ...s, copied: true }));
      setTimeout(() => setState((s) => ({ ...s, copied: false })), 2000);
    });
  }

  async function saveToPipeline() {
    const firstContact = state.contact?.contacts?.[0];
    await addToPipeline({
      company_name: prospect.company_name,
      contact_name: firstContact?.full_name || "",
      contact_email: firstContact?.email || "",
      contact_linkedin: firstContact?.linkedin_url || "",
      session_title,
      fit_reason: prospect.reason || "",
      why_now: prospect.why_now || "",
      sponsorship_angle: prospect.sponsorship_angle || "",
      generated_email: state.email,
      generated_subject: state.emailSubject,
      event_name: eventName,
      event_location: "",
    });
    setState((s) => ({ ...s, savedToPipeline: true }));
  }

  async function findContact() {
    setState((s) => ({ ...s, contactLoading: true, contact: null }));
    const domain = prospect.company_name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
    try {
      const res = await fetch("/api/find-contact", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ company_name: prospect.company_name, company_domain: domain }),
      });
      const data = await res.json();
      setState((s) => ({ ...s, contactLoading: false, contact: data }));
    } catch {
      setState((s) => ({ ...s, contactLoading: false, contact: { status: "not_found" } }));
    }
  }

  if (state.status === "skipped") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <span className="text-xs text-muted-foreground line-through">{prospect.company_name}</span>
        <span className="text-xs text-muted-foreground">· skipped</span>
        <button
          onClick={() => setState((s) => ({ ...s, status: "idle" }))}
          className="ml-auto text-xs text-[hsl(243,75%,59%)] hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{prospect.company_name}</p>
          <p className="text-xs text-[hsl(243,75%,50%)] font-medium mt-0.5">{prospect.contact_role}</p>
        </div>
        {state.status === "idle" && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={skip}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={approve}
              className="text-xs px-3 py-1.5 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] transition-colors"
            >
              Approve
            </button>
          </div>
        )}
        {state.status === "approved" && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium shrink-0">
            Approved
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{prospect.reason}</p>
      {prospect.why_now && (
        <p className="text-xs text-amber-700 leading-relaxed mt-1.5">
          <span className="font-medium">Why now:</span> {prospect.why_now}
        </p>
      )}
      {prospect.sponsorship_angle && (
        <p className="text-xs italic text-gray-400 leading-relaxed mt-1.5">{prospect.sponsorship_angle}</p>
      )}

      {state.status === "approved" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {state.emailLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Spinner />
              Generating personalised email…
            </div>
          )}
          {state.emailGenerated && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cold outreach email</p>
              {state.emailSubject && (
                <div className="mb-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                  <input
                    type="text"
                    value={state.emailSubject}
                    readOnly
                    className="w-full text-xs text-foreground border border-gray-200 rounded-md px-3 py-2 bg-gray-50 focus:outline-none font-medium"
                  />
                </div>
              )}
              <textarea
                value={state.email}
                onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                rows={8}
                className="w-full text-xs text-foreground leading-relaxed border border-gray-200 rounded-md px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1 font-mono"
              />
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={copyEmail}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors"
                >
                  {state.copied ? "Copied!" : "Copy email"}
                </button>
                {!state.contact && (
                  <button
                    onClick={findContact}
                    disabled={state.contactLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[hsl(243,75%,80%)] text-[hsl(243,75%,50%)] hover:bg-[hsl(243,75%,97%)] disabled:opacity-60 transition-colors"
                  >
                    {state.contactLoading && <Spinner />}
                    {state.contactLoading ? "Searching…" : "Find contact"}
                  </button>
                )}
                {state.savedToPipeline ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-3 py-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved to pipeline
                  </span>
                ) : (
                  <button
                    onClick={saveToPipeline}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save to pipeline
                  </button>
                )}
              </div>

              {state.contact && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {state.contact.status === "not_found" || !state.contact.contacts?.length ? (
                    <p className="text-xs text-muted-foreground italic">No contact found — try searching manually.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contacts found</p>
                      {state.contact.contacts.map((c, i) => (
                        <ContactCard key={i} contact={c} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionProspects({
  session_title,
  value_prop,
  eventName,
  event_sector,
}: {
  session_title: string;
  value_prop: string;
  eventName: string;
  event_sector?: string | null;
}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  async function fetchProspects(append: boolean) {
    const isMore = append && prospects.length > 0;
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    const exclusions = append ? prospects.map((p) => p.company_name) : [];
    const cp = getCompanyProfile();

    try {
      const res = await fetch("/api/suggest-prospects", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          session_title,
          value_prop,
          sponsor_tags: event_sector ? [event_sector] : [],
          eventName,
          exclusions,
          org_name: cp.orgName || undefined,
          event_sector: event_sector || undefined,
          packages: cp.packages || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newProspects: Prospect[] = data.prospects || [];
      setProspects((prev) => (append ? [...prev, ...newProspects] : newProspects));
      setFetched(true);
    } catch (err: any) {
      setError(err.message || "Failed to suggest prospects.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prospect suggestions</p>
        {!fetched && (
          <button
            onClick={() => fetchProspects(false)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] disabled:opacity-60 transition-colors"
          >
            {loading && <Spinner />}
            {loading ? "Finding prospects…" : "Generate"}
          </button>
        )}
      </div>

      {!fetched && !loading && (
        <p className="text-xs text-muted-foreground">Click generate to get 3 AI-suggested prospect companies for this session.</p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {fetched && prospects.length > 0 && (
        <div className="flex flex-col gap-3">
          {prospects.map((p, i) => (
            <ProspectCard
              key={`${p.company_name}-${i}`}
              prospect={p}
              session_title={session_title}
              value_prop={value_prop}
              eventName={eventName}
            />
          ))}
          <button
            onClick={() => fetchProspects(true)}
            disabled={loadingMore}
            className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md border border-gray-200 text-muted-foreground hover:bg-white disabled:opacity-60 transition-colors mt-1"
          >
            {loadingMore && <Spinner />}
            {loadingMore ? "Finding more…" : "Show 3 more"}
          </button>
        </div>
      )}
    </div>
  );
}
