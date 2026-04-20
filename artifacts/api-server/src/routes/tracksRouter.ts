import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { event_id } = req.query;
  let query = supabase.from("tracks").select("*").order("order", { ascending: true });
  if (event_id) query = query.eq("event_id", event_id as string);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.post("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { event_id, name, colour, room, capacity, order } = req.body;
  if (!event_id || !name) return res.status(400).json({ error: "event_id and name required" });
  const { data, error } = await supabase
    .from("tracks")
    .insert([{ event_id, name, colour: colour || "#6366f1", room: room || null, capacity: capacity || null, order: order ?? 0 }])
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const payload: Record<string, unknown> = {};
  ["name", "colour", "room", "capacity", "order"].forEach(
    (f) => { if (req.body[f] !== undefined) payload[f] = req.body[f]; }
  );
  const { data, error } = await supabase
    .from("tracks").update(payload).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { error } = await supabase.from("tracks").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
