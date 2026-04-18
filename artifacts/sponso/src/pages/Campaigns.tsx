import { useState, useCallback } from "react";
import { loadPipeline, savePipeline, updateEntryStage, removeEntry, STAGES } from "@/lib/pipeline";
import type { PipelineEntry, Stage } from "@/lib/pipeline";

const STAGE_COLORS: Record<Stage, { bg: string; text: string; dot: string }> = {
  "Identified":    { bg: "bg-gray-100",    text: "text-gray-600",    dot: "bg-gray-400" },
  "Contacted":     { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-400" },
  "Opened":        { bg: "bg-indigo-50",   text: "text-indigo-700",  dot: "bg-indigo-400" },
  "Replied":       { bg: "bg-purple-50",   text: "text-purple-700",  dot: "bg-purple-400" },
  "Proposal Sent": { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400" },
  "Closed Won":    { bg: "bg-green-50",    text: "text-green-700",   dot: "bg-green-500" },
  "Activated":     { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  "Renewed":       { bg: "bg-teal-50",     text: "text-teal-700",    dot: "bg-teal-500" },
  "Churned":       { bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-400" },
};

function DetailModal({ entry, onClose, onStageChange, onDelete }: {
  entry: PipelineEntry;
  onClose: () => void;
  onStageChange: (id: string, stage: Stage) => void;
  onDelete: (id: string) => void;
}) {
  const colors = STAGE_COLORS[entry.stage];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{entry.company_name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{entry.session_title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={entry.stage}
              onChange={(e) => onStageChange(entry.id, e.target.value as Stage)}
              className={`text-xs px-2.5 py-1.5 rounded-full font-medium border-0 ${colors.bg} ${colors.text} focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)]`}
            >
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {(entry.contact_name || entry.contact_email) && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contact</p>
              <div className="flex items-center gap-3 flex-wrap">
                {entry.contact_name && <span className="text-sm font-medium text-foreground">{entry.contact_name}</span>}
                {entry.contact_email && (
                  <a href={`mailto:${entry.contact_email}`} className="text-sm text-[hsl(243,75%,50%)] hover:underline">
                    {entry.contact_email}
                  </a>
                )}
                {entry.contact_linkedin && (
                  <a href={entry.contact_linkedin} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#0077B5] text-white hover:bg-[#006097] transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </section>
          )}

          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fit</p>
            {entry.fit_reason && <p className="text-sm text-foreground leading-relaxed">{entry.fit_reason}</p>}
            {entry.why_now && (
              <p className="text-sm text-amber-700 leading-relaxed mt-1.5">
                <span className="font-medium">Why now:</span> {entry.why_now}
              </p>
            )}
            {entry.sponsorship_angle && (
              <p className="text-sm text-gray-400 italic leading-relaxed mt-1.5">{entry.sponsorship_angle}</p>
            )}
          </section>

          {(entry.generated_email || entry.generated_subject) && (
            <section>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Outreach email</p>
              {entry.generated_subject && (
                <div className="mb-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-100">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium text-foreground">{entry.generated_subject}</p>
                </div>
              )}
              {entry.generated_email && (
                <pre className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 border border-gray-100 rounded-md px-4 py-3">
                  {entry.generated_email}
                </pre>
              )}
            </section>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <p className="text-xs text-muted-foreground">
              Added {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              {entry.event_name ? ` · ${entry.event_name}` : ""}
            </p>
            <button
              onClick={() => { onDelete(entry.id); onClose(); }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Remove from pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ entry, onClick }: { entry: PipelineEntry; onClick: () => void }) {
  const colors = STAGE_COLORS[entry.stage];

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("entryId", entry.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-[hsl(243,75%,70%)] hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-foreground leading-snug">{entry.company_name}</p>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${colors.dot}`} />
      </div>
      {entry.contact_name && (
        <p className="text-xs text-muted-foreground truncate">{entry.contact_name}</p>
      )}
      {entry.session_title && (
        <p className="text-xs text-[hsl(243,75%,50%)] truncate mt-1">{entry.session_title}</p>
      )}
      {entry.sponsorship_angle && (
        <p className="text-xs text-gray-400 italic leading-snug mt-1.5 line-clamp-2">{entry.sponsorship_angle}</p>
      )}
    </div>
  );
}

function KanbanColumn({ stage, entries, onDrop, onCardClick }: {
  stage: Stage;
  entries: PipelineEntry[];
  onDrop: (entryId: string, stage: Stage) => void;
  onCardClick: (entry: PipelineEntry) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const colors = STAGE_COLORS[stage];

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const entryId = e.dataTransfer.getData("entryId");
    if (entryId) onDrop(entryId, stage);
  }

  return (
    <div
      className={`flex flex-col shrink-0 w-56 rounded-xl transition-colors ${dragOver ? "bg-[hsl(243,75%,97%)]" : "bg-gray-50"}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <p className="text-xs font-semibold text-foreground">{stage}</p>
        <span className="ml-auto text-xs text-muted-foreground font-medium">{entries.length}</span>
      </div>
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-32">
        {entries.map((e) => (
          <KanbanCard key={e.id} entry={e} onClick={() => onCardClick(e)} />
        ))}
        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-300">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [entries, setEntries] = useState<PipelineEntry[]>(() => loadPipeline());
  const [selected, setSelected] = useState<PipelineEntry | null>(null);

  const reload = useCallback(() => setEntries(loadPipeline()), []);

  function handleDrop(entryId: string, stage: Stage) {
    updateEntryStage(entryId, stage);
    reload();
  }

  function handleStageChange(id: string, stage: Stage) {
    updateEntryStage(id, stage);
    const updated = loadPipeline();
    setEntries(updated);
    setSelected(updated.find((e) => e.id === id) || null);
  }

  function handleDelete(id: string) {
    removeEntry(id);
    reload();
    setSelected(null);
  }

  const byStage = (stage: Stage) => entries.filter((e) => e.stage === stage);

  const totalContacted = entries.filter((e) =>
    ["Contacted", "Opened", "Replied", "Proposal Sent", "Closed Won", "Activated", "Renewed"].includes(e.stage)
  ).length;
  const totalClosedWon = byStage("Closed Won").length;
  const totalRenewed = byStage("Renewed").length;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header & metrics */}
      <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white shrink-0">
        <h1 className="text-xl font-semibold text-foreground mb-1">Campaign Pipeline</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Track your sponsor prospects from identification to renewal.
        </p>

        {entries.length === 0 ? null : (
          <div className="flex gap-6">
            {[
              { label: "Total prospects", value: entries.length },
              { label: "Contacted", value: totalContacted },
              { label: "Closed won", value: totalClosedWon },
              { label: "Renewed", value: totalRenewed },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanban board */}
      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center max-w-xs">
            <div className="w-12 h-12 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
                <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Pipeline is empty</p>
            <p className="text-xs text-muted-foreground">Approve a prospect on the Prospects page, generate an email, then click "Save to campaign".</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full px-8 py-5 min-w-max">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                entries={byStage(stage)}
                onDrop={handleDrop}
                onCardClick={setSelected}
              />
            ))}
          </div>
        </div>
      )}

      {selected && (
        <DetailModal
          entry={selected}
          onClose={() => setSelected(null)}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
