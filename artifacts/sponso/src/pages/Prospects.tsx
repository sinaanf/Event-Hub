import { useEffect, useState } from "react";
import { useSponso, type ValueProp } from "@/context/SponsoContext";
import { useLocation, Link } from "wouter";

function getSenderName(): string {
  try {
    const raw = localStorage.getItem("sinoo_profile");
    if (raw) return JSON.parse(raw).fullName || "";
  } catch {}
  return "";
}

const STEPS = ["Agenda", "Value Props", "Prospects", "Outreach"];

type NewsArticle = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  salesAngle: string;
};

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
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function Spinner() {
  return (
    <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CompanyIntelligence({ sponsorTag, eventLocation }: { sponsorTag: string; eventLocation?: string }) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/company-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: sponsorTag, eventLocation }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setArticles(data.articles || []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load news.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sponsorTag]);

  return (
    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 pt-3 pb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Company intelligence · {sponsorTag}
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Spinner />
          Fetching latest news…
        </div>
      )}

      {!loading && error && (
        <p className="text-xs text-muted-foreground py-1">{error}</p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">No recent news found for this category.</p>
      )}

      {!loading && articles.length > 0 && (
        <div className="flex flex-col gap-4">
          {articles.map((article, i) => (
            <div key={i} className={i < articles.length - 1 ? "pb-4 border-b border-gray-200" : ""}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-muted-foreground">
                  {article.source} · {formatDate(article.publishedAt)}
                </span>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[hsl(243,75%,59%)] hover:underline shrink-0 ml-2"
                >
                  Read →
                </a>
              </div>
              <p className="text-sm font-medium text-foreground leading-snug mb-1">{article.title}</p>
              {article.salesAngle && (
                <p className="text-xs italic text-emerald-600 leading-relaxed">{article.salesAngle}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectCard({
  prospect,
  session_title,
  value_prop,
  eventName,
  eventLocation,
}: {
  prospect: Prospect;
  session_title: string;
  value_prop: string;
  eventName: string;
  eventLocation?: string;
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
  });

  function skip() {
    setState((s) => ({ ...s, status: "skipped" }));
  }

  async function approve() {
    setState((s) => ({ ...s, status: "approved", emailLoading: true }));

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: prospect.company_name,
          contact_role: prospect.contact_role,
          reason: prospect.reason,
          session_title,
          value_prop,
          eventName,
          sender_name: getSenderName(),
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
    const text = state.emailSubject
      ? `Subject: ${state.emailSubject}\n\n${state.email}`
      : state.email;
    navigator.clipboard.writeText(text).then(() => {
      setState((s) => ({ ...s, copied: true }));
      setTimeout(() => setState((s) => ({ ...s, copied: false })), 2000);
    });
  }

  function resolveCountry(loc?: string): string | undefined {
    if (!loc) return undefined;
    const part = loc.includes(",") ? loc.split(",").pop()!.trim() : loc.trim();
    const map: Record<string, string> = {
      "UK": "United Kingdom",
      "US": "United States",
      "USA": "United States",
      "UAE": "United Arab Emirates",
    };
    return map[part.toUpperCase()] ?? part;
  }

  async function findContact() {
    setState((s) => ({ ...s, contactLoading: true, contact: null }));
    const domain = prospect.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") + ".com";
    const country = resolveCountry(eventLocation);
    try {
      const res = await fetch("/api/find-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: prospect.company_name,
          company_domain: domain,
          ...(country ? { location: country } : {}),
        }),
      });
      const data = await res.json();
      setState((s) => ({ ...s, contactLoading: false, contact: data }));
    } catch {
      setState((s) => ({
        ...s,
        contactLoading: false,
        contact: { status: "not_found" },
      }));
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
        <p className="text-xs italic text-gray-400 leading-relaxed mt-1.5">
          {prospect.sponsorship_angle}
        </p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Cold outreach email
              </p>
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
              <div className="mt-2 flex items-center gap-2">
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
              </div>

              {state.contact && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {state.contact.status === "not_found" || !state.contact.contacts?.length ? (
                    <p className="text-xs text-muted-foreground italic">
                      No contact found — try searching manually.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Contacts found
                      </p>
                      {state.contact.contacts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:border-[hsl(243,75%,80%)] hover:bg-[hsl(243,75%,98%)] transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                          </div>
                          {c.linkedin_url && (
                            <a
                              href={c.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#0077B5] text-white hover:bg-[#006097] transition-colors shrink-0"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                              </svg>
                              LinkedIn
                            </a>
                          )}
                        </div>
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

function ProspectSuggestions({
  vp,
  eventName,
  eventLocation,
}: {
  vp: ValueProp;
  eventName: string;
  eventLocation?: string;
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

    try {
      const res = await fetch("/api/suggest-prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_title: vp.session_title,
          value_prop: vp.value_prop,
          sponsor_tags: vp.sponsor_tags,
          eventName,
          eventLocation,
          exclusions,
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
    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 pt-3 pb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Prospect suggestions
        </p>
        {!fetched && (
          <button
            onClick={() => fetchProspects(false)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] disabled:opacity-60 transition-colors"
          >
            {loading && <Spinner />}
            {loading ? "Finding prospects…" : "Find prospects"}
          </button>
        )}
      </div>

      {!fetched && !loading && (
        <p className="text-xs text-muted-foreground">
          Click to generate 3 AI-suggested prospect companies for this session.
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {fetched && prospects.length > 0 && (
        <div className="flex flex-col gap-3">
          {prospects.map((p, i) => (
            <ProspectCard
              key={`${p.company_name}-${i}`}
              prospect={p}
              session_title={vp.session_title}
              value_prop={vp.value_prop}
              eventName={eventName}
              eventLocation={eventLocation}
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

function ValuePropCard({ vp, eventLocation, eventName }: { vp: ValueProp; eventLocation?: string; eventName: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{vp.session_title}</h3>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{vp.value_prop}</p>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {vp.sponsor_tags.map((tag) => (
          <Link
            key={tag}
            href={`/category?tag=${encodeURIComponent(tag)}`}
            className="px-2 py-0.5 text-xs font-medium rounded-full bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)] hover:bg-[hsl(243,75%,92%)] transition-colors cursor-pointer"
          >
            {tag}
          </Link>
        ))}
      </div>
      {vp.sponsor_tags[0] && (
        <CompanyIntelligence sponsorTag={vp.sponsor_tags[0]} eventLocation={eventLocation} />
      )}
      <ProspectSuggestions vp={vp} eventName={eventName} eventLocation={eventLocation} />
    </div>
  );
}

export default function Prospects() {
  const { valueProps, eventName, eventLocation } = useSponso();
  const [, navigate] = useLocation();

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Value Props</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {eventName
            ? `Sponsor-facing value propositions for ${eventName}.`
            : "Sponsor-facing value propositions extracted from your agenda."}
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((step, i) => {
            const isActive = i === 1;
            const isComplete = i === 0;
            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isComplete
                        ? "bg-[hsl(243,75%,59%)] text-white"
                        : isActive
                        ? "bg-[hsl(243,75%,59%)] text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-sm ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="w-10 h-px bg-border mx-3" />}
              </div>
            );
          })}
        </div>

        {valueProps.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No value props yet</p>
            <p className="text-xs text-muted-foreground mb-2">Add your event agenda first and we'll generate value propositions for each session.</p>
            <button
              onClick={() => navigate("/")}
              className="text-xs text-[hsl(243,75%,59%)] hover:underline"
            >
              ← Back to Agenda Input
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {valueProps.map((vp, i) => (
              <ValuePropCard key={i} vp={vp} eventLocation={eventLocation} eventName={eventName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
