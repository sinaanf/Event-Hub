import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/", async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { data, error } = await supabase
    .from("pipeline_prospects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[pipeline] load error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});

router.post("/", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const payload = { ...req.body, stage: "Identified" };
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

router.patch("/:id/stage", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { id } = req.params;
  const { stage } = req.body;
  const { error } = await supabase
    .from("pipeline_prospects")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[pipeline] stage update error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { id } = req.params;
  const { error } = await supabase
    .from("pipeline_prospects")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[pipeline] delete error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json({ ok: true });
});

export default router;
