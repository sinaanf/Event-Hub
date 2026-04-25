import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  format, parse, startOfWeek, getDay,
  eachDayOfInterval, parseISO, setHours, setMinutes,
} from "date-fns";
import { enGB } from "date-fns/locale";
import {
  Plus, Loader2, CalendarDays, Layers, X, Edit2, Sparkles, RefreshCw,
} from "lucide-react";
import { getAccessToken } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";

// ─── Localizer ───────────────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-GB": enGB },
});

// ─── Types ────────────────────────────────────────────────────────────────────
type SinooEvent = {
  id: string; name: string; slug: string;
  start_date: string; end_date: string;
  sector: string | null; venue: string | null;
  city: string | null; country: string | null; status: string;
};

type Track = {
  id: string; event_id: string; name: string;
  colour: string; room: string | null; order: number;
};

type Session = {
  id: string; event_id: string; track_id: string | null;
  title: string; description: string | null;
  session_type: string | null; start_time: string; end_time: string;
  day: string; status: string;
  audience: string | null; sponsor_fit: string | null;
};

type CalEvent = {
  id: string; title: string;
  start: Date; end: Date;
  resourceId: string;
  resource: Session;
};

type SessionForm = {
  title: string; description: string;
  session_type: string; track_id: string;
  start_time: string; end_time: string; day: string; status: string;
};

type EventForm = {
  name: string; start_date: string; end_date: string;
  sector: string; venue: string; city: string; country: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const SESSION_TYPES = ["keynote", "panel", "workshop", "roundtable", "fireside"];
const SECTORS = ["Sustainability", "Finance", "Supply Chain", "Healthcare", "Legal", "Insurance", "AI", "Technology", "Real Estate", "Marketing"];
const STATUSES = ["draft", "confirmed", "cancelled"];

const TYPE_COLORS: Record<string, { border: string; badge: string; badgeText: string }> = {
  keynote:    { border: "#1C1C1E", badge: "#1C1C1E",  badgeText: "white" },
  panel:      { border: "#6B7280", badge: "#374151",  badgeText: "white" },
  workshop:   { border: "#1D9E75", badge: "#0F6E56",  badgeText: "white" },
  roundtable: { border: "#EF9F27", badge: "#FFF8EC",  badgeText: "#854F0B" },
  fireside:   { border: "#EF9F27", badge: "#1C1C1E",  badgeText: "white" },
  default:    { border: "#D1D5DB", badge: "#F3F4F6",  badgeText: "#6B7280" },
};

const EMPTY_SESSION_FORM: SessionForm = {
  title: "", description: "", session_type: "panel",
  track_id: "", start_time: "09:00", end_time: "10:00",
  day: "", status: "draft",
};

const EMPTY_EVENT_FORM: EventForm = {
  name: "", start_date: "", end_date: "",
  sector: "", venue: "", city: "", country: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function authHdrs(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function toDatetimeLocal(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000Z`;
}

function timeFromISO(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const inputCls =
  "text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] focus:ring-offset-1 w-full bg-white";

// ─── Custom Event Component ───────────────────────────────────────────────────
function SessionCard({ event }: { event: CalEvent }) {
  const s = event.resource;
  const colors = TYPE_COLORS[s.session_type ?? ""] ?? TYPE_COLORS.default;
  const isBreak = !s.session_type;

  if (isBreak) {
    return (
      <div className="h-full rounded px-2 py-1 overflow-hidden" style={{ background: "#F5F4F1", borderLeft: "2px solid #D1D5DB" }}>
        <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{event.title}</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-hidden"
      style={{
        background: "white",
        borderLeft: `3px solid ${colors.border}`,
        borderTop: "0.5px solid #E5E7EB",
        borderRight: "0.5px solid #E5E7EB",
        borderBottom: "0.5px solid #E5E7EB",
        borderRadius: "0 4px 4px 0",
        padding: "4px 6px",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: "#111827", lineHeight: 1.3, marginBottom: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {event.title}
      </p>
      {s.session_type && (
        <span style={{
          display: "inline-block",
          fontSize: 7,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "1px 5px",
          borderRadius: 2,
          background: colors.badge,
          color: colors.badgeText,
          marginTop: 2,
        }}>
          {s.session_type}
        </span>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveAgenda() {
  const { effectiveRole } = useProfile();
  const isOrganiser = effectiveRole === "organiser";

  // Events
  const [events, setEvents] = useState<SinooEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT_FORM);
  const [savingEvent, setSavingEvent] = useState(false);

  // Tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackColour, setNewTrackColour] = useState("#6366f1");
  const [newTrackRoom, setNewTrackRoom] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionModal, setSessionModal] = useState<"add" | "edit" | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<SessionForm>(EMPTY_SESSION_FORM);
  const [savingSession, setSavingSession] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ── Derived ──
  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedEventId), [events, selectedEventId]);

  const eventDays = useMemo(() => {
    if (!selectedEvent) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(selectedEvent.start_date),
        end: parseISO(selectedEvent.end_date),
      });
    } catch { return []; }
  }, [selectedEvent]);

  const calendarEvents = useMemo<CalEvent[]>(() => {
    return sessions
      .filter((s) => s.track_id)
      .map((s) => ({
        id: s.id,
        title: s.title,
        start: new Date(s.start_time),
        end: new Date(s.end_time),
        resourceId: s.track_id!,
        resource: s,
      }));
  }, [sessions]);


  // ── Fetch ──
  async function fetchEvents() {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/events", { headers: authHdrs() });
      if (res.ok) {
        const data: SinooEvent[] = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
          setSelectedDate(parseISO(data[0].start_date));
        }
      }
    } catch (err) { console.error(err); }
    finally { setEventsLoading(false); }
  }

  async function fetchTracks(eventId: string) {
    setTracksLoading(true);
    try {
      const res = await fetch(`/api/tracks?event_id=${eventId}`, { headers: authHdrs() });
      if (res.ok) setTracks(await res.json());
    } catch (err) { console.error(err); }
    finally { setTracksLoading(false); }
  }

  async function fetchSessions(eventId: string) {
    setSessionsLoading(true);
    try {
      const res = await fetch(`/api/sessions?event_id=${eventId}`, { headers: authHdrs() });
      if (res.ok) setSessions(await res.json());
    } catch (err) { console.error(err); }
    finally { setSessionsLoading(false); }
  }

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchTracks(selectedEventId);
      fetchSessions(selectedEventId);
      const ev = events.find((e) => e.id === selectedEventId);
      if (ev) setSelectedDate(parseISO(ev.start_date));
    }
  }, [selectedEventId]);

  // ── Event CRUD ──
  async function handleCreateEvent() {
    if (!eventForm.name || !eventForm.start_date || !eventForm.end_date) return;
    setSavingEvent(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST", headers: authHdrs(), body: JSON.stringify(eventForm),
      });
      if (res.ok) {
        const created: SinooEvent = await res.json();
        setEvents((prev) => [created, ...prev]);
        setSelectedEventId(created.id);
        setShowEventModal(false);
        setEventForm(EMPTY_EVENT_FORM);
      }
    } catch (err) { console.error(err); }
    finally { setSavingEvent(false); }
  }

  // ── Track CRUD ──
  async function handleCreateTrack() {
    if (!newTrackName.trim() || !selectedEventId) return;
    setSavingTrack(true);
    try {
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: authHdrs(),
        body: JSON.stringify({
          event_id: selectedEventId,
          name: newTrackName.trim(),
          colour: newTrackColour,
          room: newTrackRoom.trim() || null,
          order: tracks.length,
        }),
      });
      if (res.ok) {
        const created: Track = await res.json();
        setTracks((prev) => [...prev, created]);
        setShowTrackModal(false);
        setNewTrackName(""); setNewTrackColour("#6366f1"); setNewTrackRoom("");
      }
    } catch (err) { console.error(err); }
    finally { setSavingTrack(false); }
  }

  async function handleDeleteTrack(id: string) {
    if (!confirm("Delete this track? Sessions in it will lose their track assignment.")) return;
    await fetch(`/api/tracks/${id}`, { method: "DELETE", headers: authHdrs() });
    setTracks((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Session CRUD ──
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; resourceId?: string }) => {
      if (!isOrganiser) return;
      const day = format(slotInfo.start, "yyyy-MM-dd");
      const startT = `${String(slotInfo.start.getHours()).padStart(2, "0")}:${String(slotInfo.start.getMinutes()).padStart(2, "0")}`;
      const endT = `${String(slotInfo.end.getHours()).padStart(2, "0")}:${String(slotInfo.end.getMinutes()).padStart(2, "0")}`;
      setSessionForm({
        ...EMPTY_SESSION_FORM,
        day,
        start_time: startT,
        end_time: endT,
        track_id: (slotInfo.resourceId as string) ?? (tracks[0]?.id ?? ""),
      });
      setEditingSession(null);
      setSessionModal("add");
    },
    [isOrganiser, tracks]
  );

  const handleSelectEvent = useCallback((calEv: CalEvent) => {
    const s = calEv.resource;
    setEditingSession(s);
    setSessionForm({
      title: s.title,
      description: s.description ?? "",
      session_type: s.session_type ?? "panel",
      track_id: s.track_id ?? "",
      start_time: timeFromISO(s.start_time),
      end_time: timeFromISO(s.end_time),
      day: s.day,
      status: s.status,
    });
    setSessionModal("edit");
  }, []);

  async function handleSaveSession() {
    if (!sessionForm.title.trim() || !selectedEventId) return;
    setSavingSession(true);
    const payload = {
      title: sessionForm.title,
      description: sessionForm.description || null,
      session_type: sessionForm.session_type || null,
      track_id: sessionForm.track_id || null,
      event_id: selectedEventId,
      day: sessionForm.day,
      start_time: toDatetimeLocal(sessionForm.day, sessionForm.start_time),
      end_time: toDatetimeLocal(sessionForm.day, sessionForm.end_time),
      status: sessionForm.status,
    };
    try {
      if (sessionModal === "edit" && editingSession) {
        const res = await fetch(`/api/sessions/${editingSession.id}`, {
          method: "PATCH", headers: authHdrs(), body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated: Session = await res.json();
          setSessions((prev) => prev.map((s) => s.id === editingSession.id ? updated : s));
        }
      } else {
        const res = await fetch("/api/sessions", {
          method: "POST", headers: authHdrs(), body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created: Session = await res.json();
          setSessions((prev) => [...prev, created]);
        }
      }
      setSessionModal(null);
      setEditingSession(null);
    } catch (err) { console.error(err); }
    finally { setSavingSession(false); }
  }

  async function handleDeleteSession() {
    if (!editingSession || !confirm("Delete this session?")) return;
    await fetch(`/api/sessions/${editingSession.id}`, { method: "DELETE", headers: authHdrs() });
    setSessions((prev) => prev.filter((s) => s.id !== editingSession.id));
    setSessionModal(null);
    setEditingSession(null);
  }

  async function handleRegenerate(sessionId: string) {
    setRegeneratingId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/regenerate`, {
        method: "POST", headers: authHdrs(),
      });
      if (res.ok) {
        const updated: Session = await res.json();
        setSessions((prev) => prev.map((s) => s.id === sessionId ? updated : s));
        if (editingSession?.id === sessionId) setEditingSession(updated);
      }
    } catch (err) { console.error(err); }
    finally { setRegeneratingId(null); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F7F4]">

      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Agenda Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build your programme. Export to commercial documents.
          </p>
        </div>
        {isOrganiser && (
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[#1C1C1E] text-white hover:bghover:bg-[#333333]-[hsl(243,75%,52%)] transition-colors"
          >
            <Plus size={15} />
            New event
          </button>
        )}
      </div>

      {/* Event selector */}
      <div className="px-8 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        {eventsLoading ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet — create your first event.</p>
        ) : (
          <>
            <CalendarDays size={15} className="text-muted-foreground shrink-0" />
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] max-w-xs"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            {selectedEvent?.sector && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 bg-gray-50">
                {selectedEvent.sector}
              </span>
            )}
            {selectedEvent?.city && (
              <span className="text-[10px] text-muted-foreground">{selectedEvent.city}</span>
            )}
          </>
        )}
      </div>

      {/* Empty state */}
      {!eventsLoading && events.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-sm font-medium text-foreground">Create your first event to get started</p>
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[#333333] transition-colors"
          >
            <Plus size={15} />
            Create event
          </button>
        </div>
      )}

      {/* Main grid area */}
      {selectedEventId && selectedEvent && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Day tabs + Track bar */}
          <div className="px-8 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between gap-4">
            {/* Day tabs */}
            <div className="flex items-center gap-1.5">
              {eventDays.map((day, i) => {
                const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                      isSelected
                        ? "bg-[#1C1C1E] text-white"
                        : "text-muted-foreground hover:bg-gray-100"
                    }`}
                  >
                    Day {i + 1}
                    <span className={`ml-1.5 ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                      {format(day, "d MMM")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Track chips + add */}
            <div className="flex items-center gap-2 flex-wrap">
              {tracksLoading ? (
                <Loader2 size={12} className="animate-spin text-muted-foreground" />
              ) : (
                tracks.map((t) => (
                  <div
                    key={t.id}
                    style={{ borderColor: t.colour, color: t.colour }}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-white"
                  >
                    <span
                      style={{ background: t.colour }}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                    />
                    {t.name}
                    {t.room && <span className="opacity-60">· {t.room}</span>}
                    {isOrganiser && (
                      <button
                        onClick={() => handleDeleteTrack(t.id)}
                        className="opacity-40 hover:opacity-80 transition-opacity ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))
              )}
              {isOrganiser && (
                <button
                  onClick={() => setShowTrackModal(true)}
                  className="flex items-center gap-1 text-[11px] text-[#EF9F27] hover:text-[hsl(243,75%,45%)] transition-colors"
                >
                  <Plus size={12} />
                  Add track
                </button>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 overflow-hidden px-8 py-4">
            {tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Layers size={32} className="text-gray-300" />
                <p className="text-sm text-muted-foreground">Add tracks to start building your agenda</p>
                {isOrganiser && (
                  <button
                    onClick={() => setShowTrackModal(true)}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-[#EF9F27] text-[#EF9F27] hover:bg-[hsl(243,75%,97%)] transition-colors"
                  >
                    <Plus size={14} />
                    Add first track
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
                <style>{`
                  .rbc-header { padding: 10px 8px; font-size: 12px; font-weight: 600; }
                  .rbc-time-view { border: none; }
                  .rbc-time-header { border-bottom: 1px solid #f0f0f0; }
                  .rbc-time-content { border-top: none; }
                  .rbc-timeslot-group { border-bottom: 1px solid #f7f7f7; min-height: 60px; }
                  .rbc-time-slot { border-top: none; }
                  .rbc-current-time-indicator { background: #EF9F27; }
                  .rbc-event { padding: 0; border: none !important; background: transparent !important; }
                  .rbc-event.rbc-selected { box-shadow: 0 0 0 2px #1C1C1E; border-radius: 4px; }
                  .rbc-day-slot .rbc-event { border-radius: 4px; }
                  .rbc-label { font-size: 11px; color: #9ca3af; }
                  .rbc-resource-header { font-size: 12px; font-weight: 600; padding: 10px 12px; text-align: left; border-left: 1px solid #f0f0f0; }
                  .rbc-time-header-gutter { border-right: 1px solid #f0f0f0; }
                  .rbc-day-slot .rbc-time-slot { border-top: 1px solid #f9f9f9; }
                `}</style>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  defaultView={Views.DAY}
                  views={[Views.DAY]}
                  date={selectedDate}
                  onNavigate={() => {}}
                  step={30}
                  timeslots={2}
                  selectable={isOrganiser}
                  onSelectSlot={handleSelectSlot as any}
                  onSelectEvent={handleSelectEvent as any}
                  components={{ event: SessionCard as any }}
                  toolbar={false}
                  scrollToTime={setHours(setMinutes(new Date(), 0), 8)}
                  min={setHours(setMinutes(new Date(), 0), 8)}
                  max={setHours(setMinutes(new Date(), 0), 21)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Event Modal ───────────────────────────────────────────── */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold">New event</h2>
              <button onClick={() => setShowEventModal(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Event name *</label>
                <input type="text" value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. FinTech Summit 2025" className={inputCls} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Start date *</label>
                  <input type="date" value={eventForm.start_date} onChange={(e) => setEventForm((f) => ({ ...f, start_date: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">End date *</label>
                  <input type="date" value={eventForm.end_date} onChange={(e) => setEventForm((f) => ({ ...f, end_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Sector</label>
                <select value={eventForm.sector} onChange={(e) => setEventForm((f) => ({ ...f, sector: e.target.value }))} className={inputCls}>
                  <option value="">Select sector…</option>
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Venue</label>
                  <input type="text" value={eventForm.venue} onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))} placeholder="e.g. ExCeL London" className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">City</label>
                  <input type="text" value={eventForm.city} onChange={(e) => setEventForm((f) => ({ ...f, city: e.target.value }))} placeholder="e.g. London" className={inputCls} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowEventModal(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleCreateEvent}
                disabled={savingEvent || !eventForm.name || !eventForm.start_date || !eventForm.end_date}
                className="text-sm px-4 py-2 rounded-md bg-[#1C1C1E] text-white hover:bg-[#333333] disabled:opacity-60 flex items-center gap-2"
              >
                {savingEvent && <Loader2 size={13} className="animate-spin" />}
                Create event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Track Modal ──────────────────────────────────────────────── */}
      {showTrackModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold">Add track</h2>
              <button onClick={() => setShowTrackModal(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Track name *</label>
                <input type="text" value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} placeholder="e.g. Main Stage" className={inputCls} autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Room</label>
                <input type="text" value={newTrackRoom} onChange={(e) => setNewTrackRoom(e.target.value)} placeholder="e.g. Hall A" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Colour</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={newTrackColour} onChange={(e) => setNewTrackColour(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                  <span className="text-sm text-muted-foreground">{newTrackColour}</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowTrackModal(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleCreateTrack}
                disabled={savingTrack || !newTrackName.trim()}
                className="text-sm px-4 py-2 rounded-md bg-[#1C1C1E] text-white hover:bg-[#333333] disabled:opacity-60 flex items-center gap-2"
              >
                {savingTrack && <Loader2 size={13} className="animate-spin" />}
                Add track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Session Modal ─────────────────────────────────────── */}
      {sessionModal !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-semibold">
                  {sessionModal === "edit" ? "Edit session" : "Add session"}
                </h2>
                {savingSession && (
                  <p className="text-xs text-[#EF9F27] mt-0.5 flex items-center gap-1">
                    <Sparkles size={11} />
                    Generating audience & sponsor fit…
                  </p>
                )}
              </div>
              <button onClick={() => { setSessionModal(null); setEditingSession(null); }} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Session title *</label>
                <input type="text" value={sessionForm.title} onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. The Future of Green Finance" className={inputCls} autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Session type</label>
                  <select value={sessionForm.session_type} onChange={(e) => setSessionForm((f) => ({ ...f, session_type: e.target.value }))} className={inputCls}>
                    {SESSION_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Track</label>
                  <select value={sessionForm.track_id} onChange={(e) => setSessionForm((f) => ({ ...f, track_id: e.target.value }))} className={inputCls}>
                    <option value="">No track</option>
                    {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Day</label>
                  <select value={sessionForm.day} onChange={(e) => setSessionForm((f) => ({ ...f, day: e.target.value }))} className={inputCls}>
                    <option value="">Select day…</option>
                    {eventDays.map((d, i) => (
                      <option key={i} value={format(d, "yyyy-MM-dd")}>
                        Day {i + 1} · {format(d, "d MMM")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Start</label>
                  <input type="time" value={sessionForm.start_time} onChange={(e) => setSessionForm((f) => ({ ...f, start_time: e.target.value }))} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">End</label>
                  <input type="time" value={sessionForm.end_time} onChange={(e) => setSessionForm((f) => ({ ...f, end_time: e.target.value }))} className={inputCls} />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Session brief</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="2-3 bullet points on what this session covers"
                  rows={3}
                  className={`${inputCls} resize-y`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium">Status</label>
                <select value={sessionForm.status} onChange={(e) => setSessionForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>

              {/* AI fields — show when editing */}
              {sessionModal === "edit" && editingSession && (editingSession.audience || editingSession.sponsor_fit) && (
                <div className="flex gap-3 pt-1">
                  {editingSession.audience && (
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">In the room</p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-[hsl(243,75%,80%)] text-[#EF9F27] bg-[hsl(243,75%,97%)]">
                          <Sparkles size={8} />AI
                        </span>
                        <button onClick={() => handleRegenerate(editingSession.id)} disabled={regeneratingId === editingSession.id} className="text-muted-foreground hover:text-foreground disabled:opacity-40">
                          {regeneratingId === editingSession.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        </button>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{editingSession.audience}</p>
                    </div>
                  )}
                  {editingSession.sponsor_fit && (
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Why sponsor</p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-[hsl(243,75%,80%)] text-[#EF9F27] bg-[hsl(243,75%,97%)]">
                          <Sparkles size={8} />AI
                        </span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{editingSession.sponsor_fit}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-[hsl(243,75%,97%)] border border-[hsl(243,75%,90%)] rounded-md px-3 py-2.5">
                <Sparkles size={12} className="text-[#EF9F27] mt-0.5 shrink-0" />
                Claude automatically generates audience profile and sponsor fit on save.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center">
              {sessionModal === "edit" && (
                <button onClick={handleDeleteSession} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                  Delete session
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button onClick={() => { setSessionModal(null); setEditingSession(null); }} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                <button
                  onClick={handleSaveSession}
                  disabled={savingSession || !sessionForm.title.trim()}
                  className="text-sm px-4 py-2 rounded-md bg-[#1C1C1E] text-white hover:bg-[#333333] disabled:opacity-60 flex items-center gap-2"
                >
                  {savingSession && <Loader2 size={13} className="animate-spin" />}
                  {sessionModal === "edit" ? "Save changes" : "Add session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }