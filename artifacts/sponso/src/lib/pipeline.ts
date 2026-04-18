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

const LS_KEY = "sinoo_pipeline";

function lsLoad(): PipelineEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function lsSave(entries: PipelineEntry[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries));
  } catch {}
}

export async function loadPipeline(): Promise<PipelineEntry[]> {
  try {
    const res = await fetch("/api/pipeline");
    if (res.ok) {
      const data: PipelineEntry[] = await res.json();
      lsSave(data);
      return data;
    }
    console.error("[pipeline] API load failed:", res.status);
  } catch (err) {
    console.error("[pipeline] API load error:", err);
  }
  return lsLoad();
}

export async function addToPipeline(
  entry: Omit<PipelineEntry, "id" | "created_at" | "stage">
): Promise<PipelineEntry> {
  try {
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (res.ok) {
      const data: PipelineEntry = await res.json();
      const entries = lsLoad();
      entries.unshift(data);
      lsSave(entries);
      return data;
    }
    console.error("[pipeline] API insert failed:", res.status);
  } catch (err) {
    console.error("[pipeline] API insert error:", err);
  }
  const localEntry: PipelineEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    stage: "Identified",
    created_at: new Date().toISOString(),
  };
  const entries = lsLoad();
  entries.unshift(localEntry);
  lsSave(entries);
  return localEntry;
}

export async function updateEntryStage(id: string, stage: Stage): Promise<void> {
  try {
    const res = await fetch(`/api/pipeline/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) console.error("[pipeline] API stage update failed:", res.status);
  } catch (err) {
    console.error("[pipeline] API stage update error:", err);
  }
  const entries = lsLoad();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx].stage = stage;
    lsSave(entries);
  }
}

export async function removeEntry(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
    if (!res.ok) console.error("[pipeline] API delete failed:", res.status);
  } catch (err) {
    console.error("[pipeline] API delete error:", err);
  }
  lsSave(lsLoad().filter((e) => e.id !== id));
}
