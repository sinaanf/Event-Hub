import type { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";
export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  if (!supabase) {
    res.status(503).json({ error: "Supabase not configured" });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  req.userId = data.user.id;
  req.userEmail = data.user.email;
  next();
}
