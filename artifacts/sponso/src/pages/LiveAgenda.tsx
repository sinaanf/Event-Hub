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
} from "lucide-react";
import { useProfile } from "@/context/ProfileContext";
import { loadPipeline, type PipelineEntry } from "@/lib/pipeline";
import { getAccessToken } from "@/context/AuthContext";

type Speaker = { name: string; company: string };

type AgendaSession = {
  id: string;
  event_name: string | null;
  event_date: string | null;
  session_title: string | null;
  format: string | null;
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
  event_name: string;
  event_date: string;
  session_title: string;
  format: string;
  audience: string;
  sponsor_fit: string;
  speakers: string;
};

const FORMAT_OPTIONS = ["Keynote", "Panel", "Roundtable", "Workshop", "Fireside"];

const STATUS_META: Record<string, { pill: string; label: string }> = {
  available: {
    pill: "text-emerald-700 bg-emerald-50 border-emerald-200",
    label: "Available",
  },
  "proposal out": {
    pill: "text-amber-700 bg-amber-50 border-amber-200",
    label: "Proposal Out",
  },
  sold: {
    pill: "text-red-700 bg-red-50 border-red-200",
    label: "Sold",
  },
};

function authHdrs(): Record<string, string> {
  const token = getAccessToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function parseSpeakers(raw: string): Speaker[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(",");
      if (idx === -1) return { name: l, company: "" };
      return { name: l.slice(0, idx).trim(), company: l.slice(idx + 1).trim() };
    });
}

function serializeSpeakers(speakers: Speaker[] | null | undefined): string {
  if (!speakers?.length) return "";
  return speakers.map((s) => (s.company ? `${s.name}, ${s.company}` : s.name)).join("\n");
}

const EMPTY_FORM: SessionForm = {
  event_name: "",
  event_date: "",
  session_title: "",
  format: "",
  audience: "",
  sponsor_fit: "",
  speakers: "",
};

const inputCls =
  "text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1 w-full bg-white";
const textareaCls = `${inputCls} resize-y`;

export default function LiveAgenda() {
  const { effectiveRole } = useProfile();
  const isOrganiser = effectiveRole === "organiser";

  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<AgendaSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [attachTarget, setAttachTarget] = useState<AgendaSession | null>(null);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [prospects, setProspects] = useState<PipelineEntry[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", { headers: authHdrs() });
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error("[LiveAgenda] load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

  const total = sessions.length;
  const available = sessions.filter((s) => s.status === "available").length;
  const proposalOut = sessions.filter((s) => s.status === "proposal out").length;
  const sold = sessions.filter((s) => s.status === "sold").length;

  function openEdit(s: AgendaSession) {
    setEditSession(s);
    setForm({
      event_name: s.event_name ?? "",
      event_date: s.event_date ?? "",
      session_title: s.session_title ?? "",
      format: s.format ?? "",
      audience: s.audience ?? "",
      sponsor_fit: s.sponsor_fit ?? "",
      speakers: serializeSpeakers(s.speakers),
    });
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setShowAddModal(true);
  }

  async function openAttach(s: AgendaSession) {
    setAttachTarget(s);
    setProspectsLoading(true);
    try {
      setProspects(await loadPipeline());
    } catch {}
    setProspectsLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      event_name: form.event_name || null,
      event_date: form.event_date || null,
      session_title: form.session_title || null,
      format: form.format || null,
      audience: form.audience || null,
      sponsor_fit: form.sponsor_fit || null,
      speakers: form.speakers ? parseSpeakers(form.speakers) : [],
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
      console.error("[LiveAgenda] save error:", err);
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
        setSessions((prev) =>
          prev.map((s) => (s.id === attachTarget.id ? { ...s, ...updated } : s))
        );
      }
    } catch (err) {
      console.error("[LiveAgenda] attach error:", err);
    } finally {
      setAttachTarget(null);
    }
  }

  function closeModal() {
    setEditSession(null);
    setShowAddModal(false);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Live Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isOrganiser
              ? "Manage sessions and track sponsorship status"
              : "Browse sessions and attach your prospects"}
          </p>
        </div>
        {isOrganiser && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] transition-colors"
          >
            <Plus size={15} />
            Add session
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="px-8 py-5 border-b border-gray-100 bg-white shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total sessions", value: total, color: "text-foreground" },
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
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <p className="text-sm font-medium text-foreground">No sessions yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {isOrganiser
                ? "Use the Add session button above to get started."
                : "Sessions will appear here once the organiser adds them."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-3xl">
            {sessions.map((session) => {
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
                <div
                  key={session.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(session);
                          }}
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
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {session.audience && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Audience
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">{session.audience}</p>
                          </div>
                        )}
                        {session.sponsor_fit && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                              Sponsor fit
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">{session.sponsor_fit}</p>
                          </div>
                        )}
                      </div>

                      {session.speakers && session.speakers.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            Speakers
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {session.speakers.map((sp, i) => (
                              <div
                                key={i}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50"
                              >
                                <span className="font-medium text-foreground">{sp.name}</span>
                                {sp.company && (
                                  <span className="text-muted-foreground"> · {sp.company}</span>
                                )}
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
                              <span className="text-sm font-medium text-foreground">
                                {session.prospect_company}
                              </span>
                              {session.prospect_contact && (
                                <span className="text-xs text-muted-foreground">
                                  · {session.prospect_contact}
                                </span>
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
                        {!isOrganiser &&
                          session.status === "available" &&
                          !session.prospect_company && (
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

      {/* ── Edit / Add Modal ── */}
      {(editSession !== null || showAddModal) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-foreground">
                {editSession ? "Edit session" : "Add session"}
              </h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Event name</label>
                  <input
                    type="text"
                    value={form.event_name}
                    onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))}
                    placeholder="e.g. FinTech Summit 2025"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Event date</label>
                  <input
                    type="text"
                    value={form.event_date}
                    onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                    placeholder="e.g. 14 Oct 2025"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Session title</label>
                <input
                  type="text"
                  value={form.session_title}
                  onChange={(e) => setForm((f) => ({ ...f, session_title: e.target.value }))}
                  placeholder="e.g. The Future of Green Finance"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select format…</option>
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Audience</label>
                <textarea
                  value={form.audience}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                  placeholder="Describe who attends this session…"
                  rows={3}
                  className={textareaCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Sponsor fit</label>
                <textarea
                  value={form.sponsor_fit}
                  onChange={(e) => setForm((f) => ({ ...f, sponsor_fit: e.target.value }))}
                  placeholder="Why would a sponsor want to associate with this session?"
                  rows={3}
                  className={textareaCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">Speakers</label>
                <p className="text-[11px] text-muted-foreground -mt-0.5">
                  One per line: Name, Company
                </p>
                <textarea
                  value={form.speakers}
                  onChange={(e) => setForm((f) => ({ ...f, speakers: e.target.value }))}
                  placeholder={"Jane Smith, Barclays\nAlex Chen, Goldman Sachs"}
                  rows={4}
                  className={`${textareaCls} font-mono text-xs`}
                />
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
                  onClick={closeModal}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
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
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">
                  {attachTarget.session_title}
                </p>
              </div>
              <button
                onClick={() => setAttachTarget(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none mt-0.5"
              >
                ×
              </button>
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
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.company_name}
                        </p>
                        {p.contact_name && (
                          <p className="text-xs text-muted-foreground">{p.contact_name}</p>
                        )}
                        <span className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded border border-gray-200 text-muted-foreground">
                          {p.stage}
                        </span>
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
