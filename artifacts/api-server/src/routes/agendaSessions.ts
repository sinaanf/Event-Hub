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
    .from("sinoo_profile")
    .select("user_role")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data?.user_role ?? "salesperson";
}

function requireOrganiser(handler: (req: AuthRequest, res: any) => Promise<any>) {
  return async (req: AuthRequest, res: any) => {
    const role = await getUserRole(req.userId!);
    if (role !== "organiser") {
      return res.status(403).json({ error: "Organiser role required" });
    }
    return handler(req, res);
  };
}

async function generateSessionAI(
  sessionId: string,
  sessionTitle: string | null,
  format: string | null,
  sessionBrief: string | null,
  eventId: string | null,
): Promise<{ audience: string | null; sponsor_fit: string | null }> {
  if (!supabase) return { audience: null, sponsor_fit: null };

  let eventSector: string | null = null;
  if (eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("event_sector")
      .eq("id", eventId)
      .single();
    eventSector = event?.event_sector ?? null;
  }

  const userMessage = [
    eventSector ? `Event sector: ${eventSector}` : "",
    sessionTitle ? `Session title: ${sessionTitle}` : "",
    format ? `Format: ${format}` : "",
    sessionBrief ? `Session brief: ${sessionBrief}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const msg = await anthropicClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system:
        'You are a sponsorship sales strategist. Given a session title, format, brief and event sector, return a JSON object with two fields: in_the_room (1-2 sentences on the specific audience profile for this session — their job titles and what they are deciding) and why_sponsor (1-2 sentences on the commercial reason a company would sponsor this session). Be concise — no more than 30 words per field. No markdown. Return JSON only.',
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
    console.error("[agendaSessions] AI generation error:", err);
    return { audience: null, sponsor_fit: null };
  }
}

router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[agendaSessions] list error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});

router.post(
  "/",
  requireOrganiser(async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { session_title, format, session_brief, speakers, event_id, status } = req.body;

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          session_title: session_title ?? null,
          format: format ?? null,
          session_brief: session_brief ?? null,
          speakers: speakers ?? [],
          event_id: event_id ?? null,
          status: status ?? "available",
          created_by: req.userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[agendaSessions] insert error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const ai = await generateSessionAI(
      data.id,
      session_title ?? null,
      format ?? null,
      session_brief ?? null,
      event_id ?? null,
    );

    return res.status(201).json({ ...data, ...ai });
  }),
);

router.patch(
  "/:id",
  requireOrganiser(async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id } = req.params;
    const { session_title, format, session_brief, speakers, status, event_id } = req.body;

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (session_title !== undefined) payload.session_title = session_title;
    if (format !== undefined) payload.format = format;
    if (session_brief !== undefined) payload.session_brief = session_brief;
    if (speakers !== undefined) payload.speakers = speakers;
    if (status !== undefined) payload.status = status;
    if (event_id !== undefined) payload.event_id = event_id;

    const { data, error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[agendaSessions] update error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const ai = await generateSessionAI(
      id,
      (session_title ?? data.session_title) as string | null,
      (format ?? data.format) as string | null,
      (session_brief ?? data.session_brief) as string | null,
      (event_id ?? data.event_id) as string | null,
    );

    return res.json({ ...data, ...ai });
  }),
);

router.delete(
  "/:id",
  requireOrganiser(async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id } = req.params;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      console.error("[agendaSessions] delete error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json({ ok: true });
  }),
);

router.patch("/:id/prospect", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { id } = req.params;
  const { prospect_company, prospect_contact, prospect_stage } = req.body;

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (prospect_company !== undefined) payload.prospect_company = prospect_company;
  if (prospect_contact !== undefined) payload.prospect_contact = prospect_contact;
  if (prospect_stage !== undefined) payload.prospect_stage = prospect_stage;

  if (prospect_stage === "Closed Won") {
    payload.status = "sold";
  } else if (prospect_company) {
    payload.status = "proposal out";
  }

  const { data, error } = await supabase
    .from("sessions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[agendaSessions] prospect update error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});

router.post("/:id/regenerate", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { id } = req.params;

  const { data: session, error: fetchErr } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !session) {
    return res.status(404).json({ error: "Session not found" });
  }

  await generateSessionAI(
    id,
    session.session_title,
    session.format,
    session.session_brief,
    session.event_id,
  );

  const { data: updated } = await supabase.from("sessions").select("*").eq("id", id).single();
  return res.json(updated);
});

export default router;
