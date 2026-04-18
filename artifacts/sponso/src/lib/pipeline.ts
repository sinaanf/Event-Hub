export const STAGES = [
  "Identified",
  "Contacted",
  "Opened",
  "Replied",
  "Proposal Sent",
  "Closed Won",
  "Activated",
  "Renewed",
  "Churned",
] as const;

export type Stage = (typeof STAGES)[number];

export type PipelineEntry = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_linkedin: string;
  session_title: string;
  fit_reason: string;
  why_now: string;
  sponsorship_angle: string;
  generated_email: string;
  generated_subject: string;
  event_name: string;
  event_location: string;
  stage: Stage;
  created_at: string;
};

const KEY = "sinoo_pipeline";

export function loadPipeline(): PipelineEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function savePipeline(entries: PipelineEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addToPipeline(
  entry: Omit<PipelineEntry, "id" | "created_at" | "stage">
): PipelineEntry {
  const entries = loadPipeline();
  const newEntry: PipelineEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    stage: "Identified",
    created_at: new Date().toISOString(),
  };
  entries.push(newEntry);
  savePipeline(entries);
  return newEntry;
}

export function updateEntryStage(id: string, stage: Stage): void {
  const entries = loadPipeline();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx].stage = stage;
    savePipeline(entries);
  }
}

export function removeEntry(id: string): void {
  const entries = loadPipeline().filter((e) => e.id !== id);
  savePipeline(entries);
}
