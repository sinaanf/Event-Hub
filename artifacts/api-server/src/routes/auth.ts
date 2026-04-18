import { Router } from "express";
import { supabase } from "../lib/supabase";
import { logger } from "../lib/logger";

const router = Router();

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    logger.warn({ email }, "Sign in failed");
    return res.status(401).json({ error: error.message });
  }
  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user.id, email: data.user.email },
  });
});

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  if (!data.session) {
    return res.status(200).json({ message: "Check your email to confirm your account" });
  }
  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user!.id, email: data.user!.email },
  });
});

router.post("/signout", async (req, res) => {
  return res.json({ ok: true });
});

router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: "refresh_token required" });
  }
  if (!supabase) {
    return res.status(503).json({ error: "Supabase not configured" });
  }
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error || !data.session) {
    return res.status(401).json({ error: error?.message || "Refresh failed" });
  }
  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: { id: data.user!.id, email: data.user!.email },
  });
});

export default router;
