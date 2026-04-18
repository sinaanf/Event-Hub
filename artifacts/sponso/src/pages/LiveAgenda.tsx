import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Loader2,
  UserCheck,
  Building2,
  Users,
  RefreshCw,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { loadPipeline, type PipelineEntry } from "@/lib/pipeline";
import { getAccessToken } from "@/context/AuthContext";

type Speaker = { name: string; company: string };

type Event = {
  id: string;
  event_name: string;
  event_date: string | null;
  event_sector: string | null;
  created_at: string;
};

type AgendaSession = {
  id: string;
  event_id: string | null;
  session_title: string | null;
  format: string | null;
  session_brief: string | null;
  audience: string | null;
  sponsor_fit: string | null;
  status: string;
  prospect_company: string | null;
  prospect_contact: string | null;
  prospect_stage: string | null;
  speakers: Speaker[] | null;
  created_at: string;
};

type SessionForm = {
  session_title: string;
  format: string;
  session_brief: string;
  speakers: string;
};

type EventForm = {
  event_name: string;
  event_date: string;
  event_sector: string;
};

const FORMAT_OPTIONS = ["Keynote", "Panel", "Roundtable", "Workshop", "Fireside"];
const SECTOR_OPTIONS = [
  "Sustainability", "Finance", "Supply Chain", "Healthcare", "Legal", "Insurance", "AI",
];

const STATUS_META: Record<string, { pill: string; label: string }> = {
  available: { pill: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Available" },
  "proposal out": { pill: "text-amber-700 bg-amber-50 border-amber-200", label: "Proposal Out" },
  sold: { pill: "text-red-700 bg-red-50 border-red-200", label: "Sold" },
};

const EMPTY_SESSION: SessionForm = { session_title: "", format: "", session_brief: "", speakers: "" };
const EMPTY_EVENT: EventForm = { event_name: "", event_date: "", event_sector: "" };

function authHdrs(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function parseSpeakers(raw: string): Speaker[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const idx = l.indexOf(",");
    if (idx === -1) return { name: l, company: "" };
    return { name: l.slice(0, idx).trim(), company: l.slice(idx + 1).trim() };
  });
}

function serializeSpeakers(speakers: Speaker[] | null | undefined): string {
  if (!speakers?.length) return "";
  return speakers.map((s) => (s.company ? `${s.name}, ${s.company}` : s.name)).join("\n");
}

const inputCls =
  "text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1 w-full bg-white";
const textareaCls = `${inputCls} resize-y`;

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border border-[hsl(243,75%,80%)] text-[hsl(243,75%,55%)] bg-[hsl(243,75%,97%)]">
      <Sparkles size={8} />
      AI
    </span>
  );
}

export default function LiveAgenda() {
  const { effectiveRole } = useProfile();
  const isOrganiser = effectiveRole === "organiser";

  // Events
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<AgendaSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionForm>(EMPTY_SESSION);
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Prospects
  const [attachTarget, setAttachTarget] = useState<AgendaSession | null>(null);
  const [prospects, setProspects] = useState<PipelineEntry[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);

  async function fetchEvents() {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/events", { headers: authHdrs() });
      if (res.ok) {
        const data: Event[] = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEventId) setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error("[LiveAgenda] events load error:", err);
    } finally {
      setEventsLoading(false);
    }
  }

  async function fetchSessions() {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/sessions", { headers: authHdrs() });
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error("[LiveAgenda] sessions load error:", err);
    } finally {
      setSessionsLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    fetchSessions();
  }, []);

  const visibleSessions = selectedEventId
    ? sessions.filter((s) => s.event_id === selectedEventId)
    : sessions;

  const total = visibleSessions.length;
  const available = visibleSessions.filter((s) => s.status === "available").length;
  const proposalOut = visibleSessions.filter((s) => s.status === "proposal out").length;
  const sold = visibleSessions.filter((s) => s.status === "sold").length;

  // ── Event actions ──
  async function handleCreateEvent() {
    if (!eventForm.event_name.trim()) return;
    setCreatingEvent(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: authHdrs(),
        body: JSON.stringify(eventForm),
      });
      if (res.ok) {
        const created: Event = await res.json();
        setEvents((prev) => [created, ...prev]);
        setSelectedEventId(created.id);
        setShowCreateEventModal(false);
        setEventForm(EMPTY_EVENT);
      }
    } catch (err) {
      console.error("[LiveAgenda] create event error:", err);
    } finally {
      setCreatingEvent(false);
    }
  }

  // ── Session actions ──
  function openEdit(s: AgendaSession) {
    setEditSession(s);
    setSessionForm({
      session_title: s.session_title ?? "",
      format: s.format ?? "",
      session_brief: s.session_brief ?? "",
      speakers: serializeSpeakers(s.speakers),
    });
  }

  function openAdd() {
    setSessionForm(EMPTY_SESSION);
    setShowAddModal(true);
  }

  async function handleSaveSession() {
    setSaving(true);
    const payload = {
      session_title: sessionForm.session_title || null,
      format: sessionForm.format || null,
      session_brief: sessionForm.session_brief || null,
      speakers: sessionForm.speakers ? parseSpeakers(sessionForm.speakers) : [],
      event_id: selectedEventId,
    };
    try {
      if (editSession) {
        const res = await fetch(`/api/sessions/${editSession.id}`, {
          method: "PATCH",
          headers: authHdrs(),
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setSessions((prev) => prev.map((s) => (s.id === editSession.id ? { ...s, ...updated } : s)));
          setEditSession(null);
        }
      } else {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: authHdrs(),
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setSessions((prev) => [...prev, created]);
          setShowAddModal(false);
        }
      }
    } catch (err) {
      console.error("[LiveAgenda] save session error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE", headers: authHdrs() });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setEditSession(null);
    } catch {}
  }

  async function handleRegenerate(sessionId: string) {
    setRegeneratingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/regenerate`, {
        method: "POST",
        headers: authHdrs(),
      });
      if (res.ok) {
        const updated = await res.json();
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, ...updated } : s)));
      }
    } catch (err) {
      console.error("[LiveAgenda] regenerate error:", err);
    } finally {
      setRegeneratingId(null);
    }
  }

  async function openAttach(s: AgendaSession) {
    setAttachTarget(s);
    setProspectsLoading(true);
    try {
      setProspects(await loadPipeline());
    } catch {}
    setProspectsLoading(false);
  }

  async function handleAttach(prospect: PipelineEntry) {
    if (!attachTarget) return;
    try {
      const res = await fetch(`/api/sessions/${attachTarget.id}/prospect`, {
        method: "PATCH",
        headers: authHdrs(),
        body: JSON.stringify({
          prospect_company: prospect.company_name,
          prospect_contact: prospect.contact_name || null,
          prospect_stage: prospect.stage,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSessions((prev) => prev.map((s) => (s.id === attachTarget.id ? { ...s, ...updated } : s)));
      }
    } catch (err) {
      console.error("[LiveAgenda] attach error:", err);
    } finally {
      setAttachTarget(null);
    }
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // ── Render ──
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Live Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isOrganiser ? "Manage sessions and track sponsorship status" : "Browse sessions and attach your prospects"}
          </p>
        </div>
        {isOrganiser && selectedEventId && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] transition-colors"
          >
            <Plus size={15} />
            Add session
          </button>
        )}
      </div>

      {/* Event selector */}
      <div className="px-8 py-4 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        {eventsLoading ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isOrganiser ? "No events yet." : "No events yet — waiting for organiser."}
          </p>
        ) : (
          <>
            <CalendarDays size={15} className="text-muted-foreground shrink-0" />
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1 max-w-xs"
            >
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.event_name}{e.event_date ? ` · ${e.event_date}` : ""}
                </option>
              ))}
            </select>
            {selectedEvent?.event_sector && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">
                {selectedEvent.event_sector}
              </span>
            )}
          </>
        )}
        {isOrganiser && (
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="flex items-center gap-1.5 text-xs text-[hsl(243,75%,55%)] hover:text-[hsl(243,75%,45%)] transition-colors ml-1"
          >
            <Plus size={13} />
            New event
          </button>
        )}
      </div>

      {/* No events empty state */}
      {!eventsLoading && events.length === 0 && isOrganiser && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Create your first event</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Set up an event to start adding sessions and tracking sponsorship.
            </p>
          </div>
          <button
            onClick={() => setShowCreateEventModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] transition-colors"
          >
            <Plus size={15} />
            Create event
          </button>
        </div>
      )}

      {/* Metrics + sessions (only when events exist) */}
      {(events.length > 0 || !eventsLoading) && events.length > 0 && (
        <>
          {/* Metrics */}
          <div className="px-8 py-5 border-b border-gray-100 bg-white shrink-0">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Sessions", value: total, color: "text-foreground" },
                { label: "Available", value: available, color: "text-emerald-600" },
                { label: "Proposal out", value: proposalOut, color: "text-amber-600" },
                { label: "Sold", value: sold, color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-border rounded-xl px-5 py-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : visibleSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <p className="text-sm font-medium text-foreground">No sessions yet</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {isOrganiser ? "Use the Add session button above to get started." : "Sessions will appear here once the organiser adds them."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-w-3xl">
                {visibleSessions.map((session) => {
                  const isExpanded = expandedId === session.id;
                  const meta = STATUS_META[session.status] ?? STATUS_META.available;
                  const speakerCount = session.speakers?.length ?? 0;
                  const pillLabel =
                    session.status === "proposal out" && session.prospect_company
                      ? session.prospect_company
                      : session.status === "sold" && session.prospect_company
                      ? `${session.prospect_company} · Sold`
                      : meta.label;

                  return (
                    <div key={session.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Collapsed row */}
                      <div
                        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                        onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </span>
                        <p className="flex-1 text-sm font-medium text-foreground truncate">
                          {session.session_title || "Untitled session"}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {session.format && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50">
                              {session.format}
                            </span>
                          )}
                          {speakerCount > 0 && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-600 bg-gray-50 flex items-center gap-1">
                              <Users size={10} />
                              {speakerCount}
                            </span>
                          )}
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.pill}`}>
                            {pillLabel}
                          </span>
                          {isOrganiser && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(session); }}
                              className="text-muted-foreground hover:text-foreground transition-colors ml-1 p-0.5 rounded"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-5 py-5 flex flex-col gap-4">
                          {/* Session brief */}
                          {session.session_brief && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                                Session brief
                              </p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                                {session.session_brief}
                              </p>
                            </div>
                          )}

                          {/* AI-generated content */}
                          {(session.audience || session.sponsor_fit) && (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                              {session.audience && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Audience
                                    </p>
                                    <AiBadge />
                                    <button
                                      onClick={() => handleRegenerate(session.id)}
                                      disabled={regeneratingId === session.id}
                                      title="Regenerate AI content"
                                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 ml-0.5"
                                    >
                                      {regeneratingId === session.id
                                        ? <Loader2 size={11} className="animate-spin" />
                                        : <RefreshCw size={11} />}
                                    </button>
                                  </div>
                                  <p className="text-sm text-foreground leading-relaxed">{session.audience}</p>
                                </div>
                              )}
                              {session.sponsor_fit && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Sponsor fit
                                    </p>
                                    <AiBadge />
                                    {!session.audience && (
                                      <button
                                        onClick={() => handleRegenerate(session.id)}
                                        disabled={regeneratingId === session.id}
                                        title="Regenerate AI content"
                                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 ml-0.5"
                                      >
                                        {regeneratingId === session.id
                                          ? <Loader2 size={11} className="animate-spin" />
                                          : <RefreshCw size={11} />}
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground leading-relaxed">{session.sponsor_fit}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Speakers */}
                          {session.speakers && session.speakers.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Speakers
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {session.speakers.map((sp, i) => (
                                  <div key={i} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
                                    <span className="font-medium text-foreground">{sp.name}</span>
                                    {sp.company && <span className="text-muted-foreground"> · {sp.company}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Prospect bar */}
                          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3 min-h-[36px]">
                            <div className="flex items-center gap-2.5">
                              {session.prospect_company ? (
                                <>
                                  <UserCheck size={14} className="text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium text-foreground">{session.prospect_company}</span>
                                  {session.prospect_contact && (
                                    <span className="text-xs text-muted-foreground">· {session.prospect_contact}</span>
                                  )}
                                  {session.prospect_stage && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-muted-foreground">
                                      {session.prospect_stage}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">No prospect attached</span>
                              )}
                            </div>
                            {!isOrganiser && session.status === "available" && !session.prospect_company && (
                              <button
                                onClick={() => openAttach(session)}
                                className="text-xs px-3 py-1.5 rounded-md border border-[hsl(243,75%,70%)] text-[hsl(243,75%,50%)] hover:bg-[hsl(243,75%,97%)] transition-colors shrink-0"
                              >
                                Attach prospect
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Create Event Modal ── */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">New event</h2>
              <button onClick={() => setShowCreateEventModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Event name</label>
                <input
                  type="text"
                  value={eventForm.event_name}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_name: e.target.value }))}
                  placeholder="e.g. FinTech Summit 2025"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Event date</label>
                <input
                  type="text"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
                  placeholder="e.g. 14 Oct 2025"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Event sector</label>
                <select
                  value={eventForm.event_sector}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_sector: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select sector…</option>
                  {SECTOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setShowCreateEventModal(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button
                onClick={handleCreateEvent}
                disabled={creatingEvent || !eventForm.event_name.trim()}
                className="text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {creatingEvent && <Loader2 size={13} className="animate-spin" />}
                Create event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Session Modal ── */}
      {(editSession !== null || showAddModal) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {editSession ? "Edit session" : "Add session"}
                </h2>
                {saving && (
                  <p className="text-xs text-[hsl(243,75%,55%)] mt-0.5 flex items-center gap-1">
                    <Sparkles size={11} />
                    Generating AI audience & sponsor fit…
                  </p>
                )}
              </div>
              <button
                onClick={() => { setEditSession(null); setShowAddModal(false); }}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Session title</label>
                <input
                  type="text"
                  value={sessionForm.session_title}
                  onChange={(e) => setSessionForm((f) => ({ ...f, session_title: e.target.value }))}
                  placeholder="e.g. The Future of Green Finance"
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Format</label>
                <select
                  value={sessionForm.format}
                  onChange={(e) => setSessionForm((f) => ({ ...f, format: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select format…</option>
                  {FORMAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Session brief</label>
                <textarea
                  value={sessionForm.session_brief}
                  onChange={(e) => setSessionForm((f) => ({ ...f, session_brief: e.target.value }))}
                  placeholder="Add 2-3 bullet points on what this session covers"
                  rows={4}
                  className={textareaCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Speakers</label>
                <textarea
                  value={sessionForm.speakers}
                  onChange={(e) => setSessionForm((f) => ({ ...f, speakers: e.target.value }))}
                  placeholder="e.g. Sarah Jones, CSO Unilever"
                  rows={3}
                  className={`${textareaCls} font-mono text-xs`}
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-[hsl(243,75%,97%)] border border-[hsl(243,75%,90%)] rounded-md px-3 py-2.5">
                <Sparkles size={12} className="text-[hsl(243,75%,55%)] mt-0.5 shrink-0" />
                <span>Claude will automatically generate audience and sponsor fit descriptions when you save.</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center">
              {editSession && (
                <button
                  onClick={() => handleDelete(editSession.id)}
                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                >
                  Delete session
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => { setEditSession(null); setShowAddModal(false); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSession}
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] disabled:opacity-60 transition-colors flex items-center gap-2"
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editSession ? "Save changes" : "Add session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Attach Prospect Modal ── */}
      {attachTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Attach a prospect</h2>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{attachTarget.session_title}</p>
              </div>
              <button onClick={() => setAttachTarget(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none mt-0.5">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {prospectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : prospects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12 px-4">
                  No saved prospects yet. Save prospects from the Prospects page first.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {prospects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAttach(p)}
                      className="text-left flex items-start gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:border-[hsl(243,75%,70%)] hover:bg-[hsl(243,75%,98%)] transition-all w-full"
                    >
                      <Building2 size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.company_name}</p>
                        {p.contact_name && <p className="text-xs text-muted-foreground">{p.contact_name}</p>}
                        <span className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded border border-gray-200 text-muted-foreground">{p.stage}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
