import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

async function getUserRole(userId: string): Promise<string | null> {
  if (!supabase) return null;
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
    const {
      event_name,
      event_date,
      session_title,
      format,
      audience,
      sponsor_fit,
      status,
    } = req.body;
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          event_name,
          event_date,
          session_title,
          format,
          audience,
          sponsor_fit,
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
    return res.status(201).json(data);
  }),
);

router.patch(
  "/:id",
  requireOrganiser(async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    const { id } = req.params;
    const {
      event_name,
      event_date,
      session_title,
      format,
      audience,
      sponsor_fit,
      status,
    } = req.body;
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (event_name !== undefined) payload.event_name = event_name;
    if (event_date !== undefined) payload.event_date = event_date;
    if (session_title !== undefined) payload.session_title = session_title;
    if (format !== undefined) payload.format = format;
    if (audience !== undefined) payload.audience = audience;
    if (sponsor_fit !== undefined) payload.sponsor_fit = sponsor_fit;
    if (status !== undefined) payload.status = status;
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
    return res.json(data);
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

export default router;
