import { Router } from "express";
import { supabase } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { data, error } = await supabase
    .from("sinoo_profile")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") {
    console.error("[profile] load error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data || null);
});

router.post("/", async (req: AuthRequest, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  const { id, ...payload } = req.body;
  const withUser = { ...payload, user_id: req.userId };
  if (id) {
    const { data, error } = await supabase
      .from("sinoo_profile")
      .update(withUser)
      .eq("id", id)
      .eq("user_id", req.userId!)
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
    .insert([withUser])
    .select()
    .single();
  if (error) {
    console.error("[profile] insert error:", error.message);
    return res.status(500).json({ error: error.message });
  }
  return res.status(201).json(data);
});

export default router;
