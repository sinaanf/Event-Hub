import { useState, useEffect } from "react";
import { getAccessToken } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "../hooks/use-toast";
import { CalendarDays, Loader2 } from "lucide-react";

function authHdrs(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

type SinooEvent = { id: string; name: string };

interface Session {
  id: string; title: string; start_time: string;
  end_time: string; day: string; status: string; event_id: string;
  events?: { id: string; name: string };
}

interface SessionSpeaker { session_id: string; sessions: Session; }

interface CommsLog {
  id: string; action_type: string; sent_at: string; notes: string | null;
}

interface Speaker {
  id: string; name: string; job_title: string | null; company: string | null;
  headshot_url: string | null; email: string | null; phone: string | null;
  event_id: string; session_speakers: SessionSpeaker[];
  speaker_comms_log?: CommsLog[];
}

const ACTION_LABELS: Record<string, string> = {
  invited: "Added to directory",
  confirmed: "Confirmed",
  calendar_invite_sent: "Calendar invite sent",
  prep_call_requested: "Prep call requested",
  prep_call_completed: "Prep call completed",
  brief_sent: "Brief sent",
  social_drafted: "Social post drafted",
  slides_received: "Slides received",
  spoke: "Spoke at event",
  feedback_logged: "Feedback logged",
};

export default function Speakers() {
  const { effectiveRole } = useProfile();
  const isOrganiser = effectiveRole === "organiser";

  const [events, setEvents] = useState<SinooEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Speaker | null>(null);
  const [form, setForm] = useState({ name: "", job_title: "", company: "", headshot_url: "", email: "", phone: "" });
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setEventsLoading(true);
      try {
        const res = await fetch("/api/events", { headers: authHdrs() });
        if (res.ok) {
          const data: SinooEvent[] = await res.json();
          setEvents(data);
          if (data.length > 0) setSelectedEventId(data[0].id);
        }
      } catch (err) { console.error(err); }
      finally { setEventsLoading(false); }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchSpeakers();
      fetchSessions();
    }
  }, [selectedEventId]);

  async function fetchSpeakers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/speakers?event_id=${selectedEventId}`, { headers: authHdrs() });
      const data = await res.json();
      setSpeakers(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`/api/sessions?event_id=${selectedEventId}`, { headers: authHdrs() });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }

  async function fetchSpeakerDetail(id: string) {
    const res = await fetch(`/api/speakers/${id}`, { headers: authHdrs() });
    if (!res.ok) { toast({ title: "Could not load speaker details", variant: "destructive" }); return; }
    const data = await res.json();
    if (data && typeof data === "object" && !data.error) setSelected(data);
  }

  async function handleAddSpeaker() {
    if (!form.name.trim()) return;
    const res = await fetch("/api/speakers", {
      method: "POST", headers: authHdrs(),
      body: JSON.stringify({ ...form, event_id: selectedEventId }),
    });
    if (res.ok) {
      toast({ title: "Speaker added" });
      setShowAdd(false);
      setForm({ name: "", job_title: "", company: "", headshot_url: "", email: "", phone: "" });
      fetchSpeakers();
    } else {
      toast({ title: "Error adding speaker", variant: "destructive" });
    }
  }

  async function handleAssign(speakerId: string, sessionId: string) {
    setAssigning(sessionId);
    const res = await fetch(`/api/speakers/${speakerId}/sessions/${sessionId}`, {
      method: "POST", headers: authHdrs(),
    });
    setAssigning(null);
    if (res.ok) {
      toast({ title: "Speaker assigned — calendar invite sent" });
      fetchSpeakerDetail(speakerId);
      fetchSpeakers();
    } else {
      toast({ title: "Error assigning speaker", variant: "destructive" });
    }
  }

  async function handleUnassign(speakerId: string, sessionId: string) {
    await fetch(`/api/speakers/${speakerId}/sessions/${sessionId}`, {
      method: "DELETE", headers: authHdrs(),
    });
    fetchSpeakerDetail(speakerId);
    fetchSpeakers();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/speakers/${id}`, { method: "DELETE", headers: authHdrs() });
    setSelected(null);
    fetchSpeakers();
  }

  const assignedSessionIds = selected
    ? new Set(selected.session_speakers?.map((ss) => ss.session_id))
    : new Set();

  const availableSessions = sessions.filter(
    (s) => !assignedSessionIds.has(s.id) && s.event_id === selectedEventId
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8F7F4]">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Speakers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your speaker directory and session assignments.</p>
        </div>
        {isOrganiser && selectedEventId && (
          <button
          onClick={() => setShowAdd(true)}
          style={{ background: "#1C1C1E", color: "white", fontSize: 13, padding: "7px 14px", borderRadius: 6, border: "none",       cursor: "pointer" }}
>
  + Add Speaker
</button>
        )}
      </div>

      {/* Event selector */}
      <div className="px-8 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        {eventsLoading ? (
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet — create one in Agenda Builder.</p>
        ) : (
          <>
            <CalendarDays size={15} className="text-muted-foreground shrink-0" />
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1C1C1E] max-w-xs"
            >
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : speakers.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium mb-1">No speakers yet</p>
            <p className="text-sm">Add your first speaker to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {speakers.map((speaker) => {
              const allEvents = speaker.session_speakers?.flatMap((ss) => ss.sessions?.events ? [ss.sessions.events] : []);
              const uniqueEvents = [...new Map(allEvents.map((e) => [e?.id, e])).values()];
              const isReturning = uniqueEvents.some((e) => e?.id !== selectedEventId);
              return (
                <div key={speaker.id} onClick={() => fetchSpeakerDetail(speaker.id)}
                  className="bg-white border border-gray-100 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow">

                  {/* Avatar + name */}
                  <div className="flex items-start gap-3 mb-3">
                    {speaker.headshot_url && speaker.headshot_url !== "-" ? (
                      <img src={speaker.headshot_url} alt={speaker.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-semibold text-gray-400">
                        {(speaker.name || "?").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{speaker.name}</p>
                        {isReturning && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">Returning</Badge>
                        )}
                      </div>
                      {speaker.job_title && <p className="text-xs text-muted-foreground truncate">{speaker.job_title}</p>}
                      {speaker.company && <p className="text-xs text-muted-foreground truncate">{speaker.company}</p>}
                    </div>
                  </div>

                  {/* Session badges */}
                  <div className="flex flex-wrap gap-1">
                    {speaker.session_speakers?.filter((ss) => ss.sessions?.event_id === selectedEventId).map((ss) => (
                      <Badge key={ss.session_id} variant="secondary" className="text-xs">{ss.sessions?.title}</Badge>
                    ))}
                    {speaker.session_speakers?.filter((ss) => ss.sessions?.event_id === selectedEventId).length === 0 && (
                      <span className="text-xs text-muted-foreground">No sessions assigned</span>
                    )}
                  </div>

                  {/* Contact */}
                  {(speaker.email || speaker.phone) && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex gap-3">
                      {speaker.email && <a href={`mailto:${speaker.email}`} onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:underline truncate">{speaker.email}</a>}
                      {speaker.phone && <a href={`tel:${speaker.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground">{speaker.phone}</a>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Speaker Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Speaker</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { key: "name", label: "Name *", placeholder: "Jane Smith" },
              { key: "job_title", label: "Job Title", placeholder: "Chief Revenue Officer" },
              { key: "company", label: "Company", placeholder: "Acme Corp" },
              { key: "email", label: "Email", placeholder: "jane@acme.com" },
              { key: "phone", label: "Phone", placeholder: "+44 7700 900000" },
              { key: "headshot_url", label: "Headshot URL", placeholder: "https://..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1C1C1E]"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAddSpeaker}>Add Speaker</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Speaker Detail Modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Speaker Profile</DialogTitle></DialogHeader>
            <div className="flex items-start gap-4 mt-2">
              {selected.headshot_url && selected.headshot_url !== "-" ? (
                <img src={selected.headshot_url} alt={selected.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-400 flex-shrink-0">
                  {(selected.name || "?").charAt(0)}
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg">{selected.name}</h2>
                {selected.job_title && <p className="text-sm text-muted-foreground">{selected.job_title}</p>}
                {selected.company && <p className="text-sm text-muted-foreground">{selected.company}</p>}
                <div className="flex gap-3 mt-2">
                  {selected.email && <a href={`mailto:${selected.email}`} className="text-xs text-blue-600 hover:underline">{selected.email}</a>}
                  {selected.phone && <a href={`tel:${selected.phone}`} className="text-xs text-muted-foreground">{selected.phone}</a>}
                </div>
              </div>
            </div>

            {/* Sessions */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">Sessions</h3>
              {selected.session_speakers?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sessions assigned yet</p>
              ) : (
                <div className="space-y-2">
                  {selected.session_speakers?.map((ss) => (
                    <div key={ss.session_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{ss.sessions?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ss.sessions?.events?.name} · {ss.sessions?.day ? new Date(ss.sessions.day).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                      {isOrganiser && ss.sessions?.event_id === selectedEventId && (
                        <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700"
                          onClick={() => handleUnassign(selected.id, ss.session_id)}>Remove</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isOrganiser && availableSessions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Assign to session</p>
                  <div className="space-y-1">
                    {availableSessions.map((s) => (
                      <button key={s.id} disabled={assigning === s.id}
                        onClick={() => handleAssign(selected.id, s.id)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50">
                        {assigning === s.id ? "Assigning..." : `+ ${s.title}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comms Timeline */}
            {selected.speaker_comms_log && selected.speaker_comms_log.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold mb-2">Timeline</h3>
                <div className="space-y-2">
                  {[...selected.speaker_comms_log]
                    .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                    .map((log) => (
                      <div key={log.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{ACTION_LABELS[log.action_type] ?? log.action_type}</p>
                          {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(log.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {isOrganiser && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)}>Remove Speaker</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}