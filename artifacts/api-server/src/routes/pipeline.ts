import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { data, error } = await supabase
    .from("pipeline_prospects")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[pipeline] load error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});

router.post("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const payload = { ...req.body, stage: "Identified", user_id: req.userId };
  const { data, error } = await supabase
    .from("pipeline_prospects")
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error("[pipeline] insert error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(data);
});

router.patch("/:id/stage", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { id } = req.params;
  const { stage } = req.body;
  const { error } = await supabase
    .from("pipeline_prospects")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", req.userId!);
  if (error) {
    console.error("[pipeline] stage update error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ ok: true });
});

router.delete("/:id", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { id } = req.params;
  const { error } = await supabase
    .from("pipeline_prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", req.userId!);
  if (error) {
    console.error("[pipeline] delete error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ ok: true });
});

export default router;
