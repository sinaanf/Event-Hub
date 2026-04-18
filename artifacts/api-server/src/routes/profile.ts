import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/", async (_req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { data, error } = await supabase
    .from("sinoo_profile")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error("[profile] load error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data || null);
});

router.post("/", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { id, ...payload } = req.body;
  if (id) {
    const { data, error } = await supabase
      .from("sinoo_profile")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[profile] update error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  }

  const { data, error } = await supabase
    .from("sinoo_profile")
    .insert([payload])
    .select()
    .single();
  if (error) {
    console.error("[profile] insert error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(data);
});

export default router;
