import { useState, useEffect } from "react";
import { getAccessToken } from "@/context/AuthContext";
import { Target, ChevronDown, ChevronUp } from "lucide-react";

function authHdrs(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type SinooEvent = { id: string; name: string; location?: string };

type Session = {
  id: string; title: string; start_time: string; end_time: string;
  day: string; session_type: string | null; audience: string | null;
  sponsor_fit: string | null; status: string;
};

type Prospect = {
  company_name: string; reason: string; contact_role: string;
  company_size?: string; why_now?: string; sponsorship_angle?: string;
};

type ContactPerson = {
  full_name: string; title: string; email: string; linkedin_url: string;
};

type ContactResult = { status: "found" | "not_found"; contacts?: ContactPerson[] };

type ProspectState = {
  status: "idle" | "approved" | "skipped";
  emailSubject: string; email: string; emailLoading: boolean;
  emailGenerated: boolean; copied: boolean; contactLoading: boolean;
  contact: ContactResult | null; savedToPipeline: boolean;
};

const NON_COMMERCIAL = ["break","lunch","networking","registration","coffee","drinks","welcome","close"];

function isSponsarable(s: Session) {
  const t = s.title.toLowerCase();
  return !NON_COMMERCIAL.some((kw) => t.includes(kw));
}

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

function sessionTypeLabel(t: string | null) {
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg style={{ width: size, height: size }} className="animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ContactCard({ contact }: { contact: ContactPerson }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{contact.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{contact.title}</p>
        {contact.email && (
          <div className="flex items-center gap-2 mt-1">
            <a href={`mailto:${contact.email}`} className="text-xs text-[#EF9F27] hover:underline truncate">{contact.email}</a>
            <button onClick={() => { navigator.clipboard.writeText(contact.email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-muted-foreground hover:bg-white transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
      {contact.linkedin_url && (
        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-[#0077B5] text-white hover:bg-[#006097] transition-colors shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          LinkedIn
        </a>
      )}
    </div>
  );
}

function ProspectCard({ prospect, sessionTitle, valueProp, eventName, eventLocation }: {
  prospect: Prospect; sessionTitle: string; valueProp: string; eventName: string; eventLocation?: string;
}) {
  const [state, setState] = useState<ProspectState>({
    status: "idle", emailSubject: "", email: "", emailLoading: false,
    emailGenerated: false, copied: false, contactLoading: false, contact: null, savedToPipeline: false,
  });

  async function approve() {
    setState((s) => ({ ...s, status: "approved", emailLoading: true }));
    try {
      const token = getAccessToken();
      const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
      const res = await fetch("/api/generate-email", {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ company_name: prospect.company_name, contact_role: prospect.contact_role, reason: prospect.reason, session_title: sessionTitle, value_prop: valueProp, eventName }),
      });
      const data = await res.json();
      setState((s) => ({ ...s, emailLoading: false, emailGenerated: true, emailSubject: data.subject || "", email: data.email || "" }));
    } catch { setState((s) => ({ ...s, emailLoading: false, emailGenerated: true })); }
  }

  async function findContact() {
    setState((s) => ({ ...s, contactLoading: true, contact: null }));
    const token = getAccessToken();
    const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
    try {
      const res = await fetch("/api/find-contact", {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ company_name: prospect.company_name, company_domain: prospect.company_name.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com" }),
      });
      setState((s) => ({ ...s, contactLoading: false, contact: null }));
      const data = await res.json();
      setState((s) => ({ ...s, contactLoading: false, contact: data }));
    } catch { setState((s) => ({ ...s, contactLoading: false, contact: { status: "not_found" } })); }
  }

  async function saveToPipeline() {
    const firstContact = state.contact?.contacts?.[0];
    const token = getAccessToken();
    const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
    try {
      await fetch("/api/pipeline", {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ company_name: prospect.company_name, contact_name: firstContact?.full_name || "", contact_email: firstContact?.email || "", contact_linkedin: firstContact?.linkedin_url || "", session_title: sessionTitle, fit_reason: prospect.reason || "", why_now: prospect.why_now || "", sponsorship_angle: prospect.sponsorship_angle || "", generated_email: state.email, generated_subject: state.emailSubject, event_name: eventName, event_location: eventLocation || "" }),
      });
      setState((s) => ({ ...s, savedToPipeline: true }));
    } catch {}
  }

  if (state.status === "skipped") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <span className="text-xs text-muted-foreground line-through">{prospect.company_name}</span>
        <span className="text-xs text-muted-foreground">· skipped</span>
        <button onClick={() => setState((s) => ({ ...s, status: "idle" }))} className="ml-auto text-xs text-[#EF9F27] hover:underline">Undo</button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{prospect.company_name}</p>
          <p className="text-xs text-[#EF9F27] font-medium mt-0.5">{prospect.contact_role}</p>
        </div>
        {state.status === "idle" && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setState((s) => ({ ...s, status: "skipped" }))} className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors">Skip</button>
            <button onClick={approve} className="text-xs px-3 py-1.5 rounded-md bg-[#1C1C1E] text-white hover:bg-[#333333] transition-colors">Approve</button>
          </div>
        )}
        {state.status === "approved" && <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium shrink-0">Approved</span>}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{prospect.reason}</p>
      {prospect.why_now && <p className="text-xs text-amber-700 leading-relaxed mt-1.5"><span className="font-medium">Why now:</span> {prospect.why_now}</p>}
      {prospect.sponsorship_angle && <p className="text-xs italic text-gray-400 leading-relaxed mt-1.5">{prospect.sponsorship_angle}</p>}

      {state.status === "approved" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {state.emailLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Spinner />Generating personalised email…</div>}
          {state.emailGenerated && (
            <>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cold outreach email</p>
              {state.emailSubject && (
                <div className="mb-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                  <input type="text" value={state.emailSubject} readOnly className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 bg-gray-50 font-medium focus:outline-none" />
                </div>
              )}
              <textarea value={state.email} onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))} rows={8}
                className="w-full text-xs leading-relaxed border border-gray-200 rounded-md px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] font-mono" />
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button onClick={() => { const text = state.emailSubject ? `Subject: ${state.emailSubject}\n\n${state.email}` : state.email; navigator.clipboard.writeText(text).then(() => { setState((s) => ({ ...s, copied: true })); setTimeout(() => setState((s) => ({ ...s, copied: false })), 2000); }); }}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors">
                  {state.copied ? "Copied!" : "Copy email"}
                </button>
                {!state.contact && (
                  <button onClick={findContact} disabled={state.contactLoading}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[#1C1C1E] text-[#EF9F27] hover:bg-[#FFF8EC] disabled:opacity-60 transition-colors">
                    {state.contactLoading && <Spinner size={12} />}
                    {state.contactLoading ? "Searching…" : "Find contact"}
                  </button>
                )}
                {state.savedToPipeline
                  ? <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-3 py-1.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Saved to pipeline</span>
                  : <button onClick={saveToPipeline} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Save to pipeline</button>
                }
              </div>
              {state.contact && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {!state.contact.contacts?.length
                    ? <p className="text-xs text-muted-foreground italic">No contact found — try searching manually on LinkedIn.</p>
                    : <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contacts found</p>
                        {state.contact.contacts.map((c, i) => <ContactCard key={i} contact={c} />)}
                      </div>
                  }
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SessionProspects({ session, eventName, eventLocation }: { session: Session; eventName: string; eventLocation?: string }) {
  const [open, setOpen] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open && !fetched && !loading) fetchProspects(false); }, [open]);

  async function fetchProspects(append: boolean) {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    const exclusions = append ? prospects.map((p) => p.company_name) : [];
    const valueProp = session.sponsor_fit || session.audience || session.title;
    const token = getAccessToken();
    const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
    try {
      const res = await fetch("/api/suggest-prospects", {
        method: "POST", headers: hdrs,
        body: JSON.stringify({ session_title: session.title, value_prop: valueProp, eventName, eventLocation, exclusions }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setProspects((prev) => append ? [...prev, ...(data.prospects || [])] : (data.prospects || []));
      setFetched(true);
    } catch (err: any) { setError(err.message || "Failed to suggest prospects."); }
    finally { setLoading(false); setLoadingMore(false); }
  }

  const valueProp = session.sponsor_fit || session.audience || "";

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground leading-snug">{session.title}</span>
            {session.session_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF8EC] text-[#EF9F27] font-medium shrink-0">{sessionTypeLabel(session.session_type)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{formatTime(session.start_time)} – {formatTime(session.end_time)}</p>
          {valueProp && <p className="text-xs text-gray-500 leading-relaxed mt-1.5 line-clamp-2">{valueProp}</p>}
        </div>
        <div className="shrink-0 mt-0.5 text-muted-foreground">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 bg-[#FFF8EC]">
          {(session.audience || session.sponsor_fit) && (
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {session.audience && (
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">In the room</p>
                  <p className="text-xs text-foreground leading-relaxed">{session.audience}</p>
                </div>
              )}
              {session.sponsor_fit && (
                <div className="rounded-lg bg-white border border-gray-100 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Why sponsor</p>
                  <p className="text-xs text-foreground leading-relaxed">{session.sponsor_fit}</p>
                </div>
              )}
            </div>
          )}
          {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground py-3"><Spinner />Finding prospect companies…</div>}
          {error && <p className="text-xs text-red-500 py-2">{error}</p>}
          {fetched && prospects.length > 0 && (
            <div className="flex flex-col gap-3">
              {prospects.map((p, i) => (
                <ProspectCard key={`${p.company_name}-${i}`} prospect={p} sessionTitle={session.title} valueProp={valueProp} eventName={eventName} eventLocation={eventLocation} />
              ))}
              <button onClick={() => fetchProspects(true)} disabled={loadingMore}
                className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md border border-gray-200 text-muted-foreground hover:bg-white disabled:opacity-60 transition-colors mt-1">
                {loadingMore && <Spinner size={12} />}
                {loadingMore ? "Finding more…" : "Show 3 more"}
              </button>
            </div>
          )}
          {!loading && fetched && prospects.length === 0 && !error && (
            <p className="text-xs text-muted-foreground italic py-2">No prospects generated. Check the session has a description in the Agenda Builder.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Prospects() {
  const [events, setEvents] = useState<SinooEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    async function fetchEvents() {
      setEventsLoading(true);
      try {
        const token = getAccessToken();
        const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
        const res = await fetch("/api/events", { headers: hdrs });
        if (res.ok) { const data: SinooEvent[] = await res.json(); setEvents(data); if (data.length > 0) setSelectedEventId(data[0].id); }
      } catch (err) { console.error(err); }
      finally { setEventsLoading(false); }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    async function fetchSessions() {
      setSessionsLoading(true);
      try {
        const token = getAccessToken();
        const hdrs = token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
        const res = await fetch(`/api/sessions?event_id=${selectedEventId}`, { headers: hdrs });
        if (res.ok) { const data: Session[] = await res.json(); setSessions(data.filter(isSponsarable)); }
      } catch (err) { console.error(err); }
      finally { setSessionsLoading(false); }
    }
    fetchSessions();
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-1">Prospects</h1>
            <p className="text-sm text-muted-foreground">AI-suggested sponsor prospects for each session in your live agenda.</p>
          </div>
          {!eventsLoading && events.length > 1 && (
            <select value={selectedEventId || ""} onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] shrink-0">
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>

        {eventsLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Spinner />Loading events…</div>}

        {!eventsLoading && events.length === 0 && (
          <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF8EC] flex items-center justify-center"><Target size={20} className="text-[#EF9F27]" /></div>
            <p className="text-sm font-medium text-foreground">No events found</p>
            <p className="text-xs text-muted-foreground">Create an event in the Agenda Builder first.</p>
          </div>
        )}

        {!eventsLoading && events.length > 0 && sessionsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Spinner />Loading sessions…</div>
        )}

        {!eventsLoading && !sessionsLoading && sessions.length === 0 && events.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF8EC] flex items-center justify-center"><Target size={20} className="text-[#EF9F27]" /></div>
            <p className="text-sm font-medium text-foreground">No sponsorable sessions yet</p>
            <p className="text-xs text-muted-foreground">Add sessions with descriptions in the Agenda Builder and the AI will generate audience and sponsor fit profiles.</p>
          </div>
        )}

        {!sessionsLoading && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {selectedEvent && <p className="text-xs text-muted-foreground mb-1">{sessions.length} sponsorable session{sessions.length !== 1 ? "s" : ""} · {selectedEvent.name}</p>}
            {sessions.map((session) => (
              <SessionProspects key={session.id} session={session} eventName={selectedEvent?.name || ""} eventLocation={selectedEvent?.location} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}