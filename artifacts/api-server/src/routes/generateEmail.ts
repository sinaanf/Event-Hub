import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a senior sponsorship sales director at a premium B2B conference business. Write a short, sharp cold outreach email under 130 words. Rules: 1) Never use phrases like natural fit, perfectly positioned, measurable value, or actively evaluating — these sound AI-generated, 2) Open with a specific observation about why this company belongs in the room — not a compliment, a commercial insight, 3) Describe the audience in one punchy sentence — job titles, what they are deciding right now, 4) Reference one specific sponsorship package by name and price with a one-line reason why it suits them specifically, 5) End with a direct low-friction question — not would a call make sense, something more human like are you the right person to talk to about this or happy to send more detail if useful, 6) Sign off with just the sender name and company, no Best regards. Return JSON with subject and body fields only, no markdown.`;

router.post("/generate-email", async (req, res) => {
  const { company_name, contact_role, reason, session_title, value_prop, eventName, sender_name, org_name, packages } = req.body as {
    company_name?: string;
    contact_role?: string;
    reason?: string;
    session_title?: string;
    value_prop?: string;
    eventName?: string;
    sender_name?: string;
    org_name?: string;
    packages?: string;
  };

  if (!company_name || !contact_role || !session_title) {
    res.status(400).json({ error: "company_name, contact_role, and session_title are required" });
    return;
  }

  const userMessage = [
    org_name ? `Event organiser: ${org_name}` : "",
    `Event: ${eventName || "our conference"}`,
    `Session: ${session_title}`,
    `Value proposition for sponsors: ${value_prop || ""}`,
    `Target company: ${company_name}`,
    `Contact role: ${contact_role}`,
    `Why they're a fit: ${reason || ""}`,
    packages ? `Sponsorship packages to reference:\n${packages}` : "",
    sender_name
      ? `Sign off the email with this name: ${sender_name}${org_name ? `, ${org_name}` : ""}.`
      : `Sign off the email with [Your name]${org_name ? `, ${org_name}` : ""}.`,
  ].filter(Boolean).join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    let raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw);
    res.json({ subject: parsed.subject || "", email: parsed.body || "" });
  } catch (err) {
    console.error("[generate-email] Error:", err);
    res.status(500).json({ error: "Failed to generate email. Please try again." });
  }
});

export default router;
