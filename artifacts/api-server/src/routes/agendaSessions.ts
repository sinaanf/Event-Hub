import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getUserRole(userId: string): Promise<string> {
  if (!supabase) return "salesperson";
  const { data } = await supabase
    .from("sinoo_profile").select("user_role").eq("user_id", userId).limit(1).single();
  return data?.user_role ?? "salesperson";
}

function requireOrganiser(handler: (req: AuthRequest, res: any) => Promise<any>) {
  return async (req: AuthRequest, res: any) => {
    const role = await getUserRole(req.userId!);
    if (role !== "organiser") return res.status(403).json({ error: "Organiser role required" });
    return handler(req, res);
  };
}

async function generateSessionAI(
  sessionId: string,
  title: string | null,
  sessionType: string | null,
  description: string | null,
  eventId: string | null
): Promise<{ audience: string | null; sponsor_fit: string | null }> {
  if (!supabase) return { audience: null, sponsor_fit: null };

  let eventSector: string | null = null;
  if (eventId) {
    const { data: event } = await supabase
      .from("events").select("sector").eq("id", eventId).single();
    eventSector = event?.sector ?? null;
  }

  const userMessage = [
    eventSector ? `Event sector: ${eventSector}` : "",
    title ? `Session title: ${title}` : "",
    sessionType ? `Format: ${sessionType}` : "",
    description ? `Session brief: ${description}` : "",
  ].filter(Boolean).join("\n");

  try {
    const msg = await anthropicClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system:
        'You are a sponsorship sales strategist. Given a session title, format, brief and event sector, return a JSON object with two fields: in_the_room (1-2 sentences on the specific audience profile — their job titles and what they are deciding) and why_sponsor (1-2 sentences on the commercial reason a company would sponsor this session). Be concise — no more than 30 words per field. No markdown. Return JSON only.',
      messages: [{ role: "user", content: userMessage }],
    });

    let raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw);
    const audience = parsed.in_the_room || null;
    const sponsor_fit = parsed.why_sponsor || null;

    await supabase
      .from("sessions")
      .update({ audience, sponsor_fit, updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    return { audience, sponsor_fit };
  } catch (err) {
    console.error("[sessions] AI generation error:", err);
    return { audience: null, sponsor_fit: null };
  }
}

// GET /sessions?event_id=
router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { event_id } = req.query;
  let query = supabase.from("sessions").select("*").order("start_time", { ascending: true });
  if (event_id) query = query.eq("event_id", event_id as string);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /sessions
router.post("/", requireOrganiser(async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { title, description, session_type, start_time, end_time, day, track_id, event_id, status } = req.body;
  if (!title || !start_time || !end_time || !day)
    return res.status(400).json({ error: "title, start_time, end_time and day are required" });

  const { data, error } = await supabase
    .from("sessions")
    .insert([{
      title,
      description: description ?? null,
      session_type: session_type ?? null,
      start_time,
      end_time,
      day,
      track_id: track_id ?? null,
      event_id: event_id ?? null,
      status: status ?? "draft",
    }])
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const ai = await generateSessionAI(data.id, title, session_type ?? null, description ?? null, event_id ?? null);
  return res.status(201).json({ ...data, ...ai });
}));

// PATCH /sessions/:id
router.patch("/:id", requireOrganiser(async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  ["title", "description", "session_type", "start_time", "end_time", "day", "track_id", "status", "is_sponsored", "sponsor_id"].forEach(
    (f) => { if (req.body[f] !== undefined) payload[f] = req.body[f]; }
  );
  const { data, error } = await supabase
    .from("sessions").update(payload).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const ai = await generateSessionAI(
    req.params.id,
    (req.body.title ?? data.title) as string | null,
    (req.body.session_type ?? data.session_type) as string | null,
    (req.body.description ?? data.description) as string | null,
    (data.event_id) as string | null
  );
  return res.json({ ...data, ...ai });
}));

// DELETE /sessions/:id
router.delete("/:id", requireOrganiser(async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { error } = await supabase.from("sessions").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}));

// POST /sessions/:id/regenerate
router.post("/:id/regenerate", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { data: session, error } = await supabase
    .from("sessions").select("*").eq("id", req.params.id).single();
  if (error || !session) return res.status(404).json({ error: "Session not found" });

  await generateSessionAI(req.params.id, session.title, session.session_type, session.description, session.event_id);
  const { data: updated } = await supabase.from("sessions").select("*").eq("id", req.params.id).single();
  return res.json(updated);
});

export default router;