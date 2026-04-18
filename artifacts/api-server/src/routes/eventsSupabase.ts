import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[events] list error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});

router.post("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { event_name, event_date, event_sector } = req.body;
  if (!event_name) {
    return res.status(400).json({ error: "event_name is required" });
  }
  const { data, error } = await supabase
    .from("events")
    .insert([{ event_name, event_date: event_date || null, event_sector: event_sector || null, created_by: req.userId }])
    .select()
    .single();
  if (error) {
    console.error("[events] insert error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(data);
});

export default router;
