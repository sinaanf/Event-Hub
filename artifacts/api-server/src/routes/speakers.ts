import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import { sendCalendarInvite } from "../lib/calendarInvite";

const router = Router();
router.use(requireAuth);

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

function requireOrganiser(
  handler: (req: AuthRequest, res: any) => Promise<any>,
) {
  return async (req: AuthRequest, res: any) => {
    const role = await getUserRole(req.userId!);
    if (role !== "organiser")
      return res.status(403).json({ error: "Organiser role required" });
    return handler(req, res);
  };
}

// GET /speakers?event_id=
router.get("/", async (req: AuthRequest, res) => {
  if (!supabase)
    return res.status(503).json({ error: "Supabase not configured" });
  const { event_id } = req.query;

  let query = supabase
    .from("speakers")
    .select(
      `
      *,
      session_speakers (
        session_id,
        sessions (
          id, title, start_time, end_time, day, status, event_id
        )
      )
    `,
    )
    .order("created_at", { ascending: true });

  if (event_id) query = query.eq("event_id", event_id as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /speakers/:id
router.get("/:id", async (req: AuthRequest, res) => {
  if (!supabase)
    return res.status(503).json({ error: "Supabase not configured" });

  const { data, error } = await supabase
    .from("speakers")
    .select(`
      *,
      session_speakers (
        session_id,
        sessions (
          id, title, start_time, end_time, day, status, event_id
        )
      ),
      speaker_comms_log (
        id, action_type, sent_at, notes, event_id
      )
    `)
    .eq("id", req.params.id)
    .single();
  console.log("[speakers/:id] data:", JSON.stringify(data), "error:", JSON.stringify(error));
  if (error || !data) return res.status(404).json({ error: error?.message || "Not found", data, error });
  return res.json(data);
});

// POST /speakers
router.post(
  "/",
  requireOrganiser(async (req, res) => {
    if (!supabase)
      return res.status(503).json({ error: "Supabase not configured" });
    const { name, job_title, company, headshot_url, email, phone, event_id } =
      req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const { data, error } = await supabase
      .from("speakers")
      .insert([
        { name, job_title, company, headshot_url, email, phone, event_id },
      ])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Log to comms timeline
    if (event_id) {
      await supabase.from("speaker_comms_log").insert([
        {
          speaker_id: data.id,
          event_id,
          action_type: "invited",
          notes: "Speaker added to directory",
        },
      ]);
    }

    return res.status(201).json(data);
  }),
);

// PATCH /speakers/:id
router.patch(
  "/:id",
  requireOrganiser(async (req, res) => {
    if (!supabase)
      return res.status(503).json({ error: "Supabase not configured" });
    const payload: Record<string, unknown> = {};
    ["name", "job_title", "company", "headshot_url", "email", "phone"].forEach(
      (f) => {
        if (req.body[f] !== undefined) payload[f] = req.body[f];
      },
    );

    const { data, error } = await supabase
      .from("speakers")
      .update(payload)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }),
);

// DELETE /speakers/:id
router.delete(
  "/:id",
  requireOrganiser(async (req, res) => {
    if (!supabase)
      return res.status(503).json({ error: "Supabase not configured" });
    const { error } = await supabase
      .from("speakers")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }),
);

// POST /speakers/:id/sessions/:sessionId — assign speaker to session
router.post(
  "/:id/sessions/:sessionId",
  requireOrganiser(async (req, res) => {
    if (!supabase)
      return res.status(503).json({ error: "Supabase not configured" });

    const { id: speakerId, sessionId } = req.params;

    // Get speaker
    const { data: speaker, error: speakerErr } = await supabase
      .from("speakers")
      .select("*")
      .eq("id", speakerId)
      .single();
    if (speakerErr || !speaker)
      return res.status(404).json({ error: "Speaker not found" });

    // Get session + event
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("*, events(id, name)")
      .eq("id", sessionId)
      .single();
    if (sessionErr || !session)
      return res.status(404).json({ error: "Session not found" });

    // Create join
    const { error: joinErr } = await supabase
      .from("session_speakers")
      .insert([{ speaker_id: speakerId, session_id: sessionId }]);
    if (joinErr) return res.status(500).json({ error: joinErr.message });

    // Log to comms timeline
    await supabase.from("speaker_comms_log").insert([
      {
        speaker_id: speakerId,
        event_id: session.event_id,
        action_type: "calendar_invite_sent",
        notes: `Assigned to session: ${session.title}`,
      },
    ]);

    // Send calendar invite if speaker has email
    if (speaker.email) {
      try {
        await sendCalendarInvite(
          { name: speaker.name, email: speaker.email },
          {
            title: session.title,
            start: new Date(session.start_time),
            end: new Date(session.end_time),
            eventName: (session.events as any)?.name ?? "Event",
            trackName: null,
          },
        );
      } catch (err) {
        console.error("[speakers] Calendar invite failed:", err);
        // Don't fail the request — assignment succeeded
      }
    }

    return res.json({ ok: true, session });
  }),
);

// DELETE /speakers/:id/sessions/:sessionId — unassign
router.delete(
  "/:id/sessions/:sessionId",
  requireOrganiser(async (req, res) => {
    if (!supabase)
      return res.status(503).json({ error: "Supabase not configured" });
    const { error } = await supabase
      .from("session_speakers")
      .delete()
      .eq("speaker_id", req.params.id)
      .eq("session_id", req.params.sessionId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }),
);

export default router;
