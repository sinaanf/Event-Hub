import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert B2B sponsorship sales writer. Write a personalised cold outreach email under 150 words. The email should be direct, specific, and compelling — referencing the company's fit with the conference session. No filler phrases like 'I hope this finds you well'. Use a friendly professional tone. Return only the email body text, no subject line, no markdown.`;

router.post("/generate-email", async (req, res) => {
  const { company_name, contact_role, reason, session_title, value_prop, eventName } = req.body as {
    company_name?: string;
    contact_role?: string;
    reason?: string;
    session_title?: string;
    value_prop?: string;
    eventName?: string;
  };

  if (!company_name || !contact_role || !session_title) {
    res.status(400).json({ error: "company_name, contact_role, and session_title are required" });
    return;
  }

  const userMessage = [
    `Event: ${eventName || "our conference"}`,
    `Session: ${session_title}`,
    `Value proposition for sponsors: ${value_prop || ""}`,
    `Target company: ${company_name}`,
    `Contact role: ${contact_role}`,
    `Why they're a fit: ${reason || ""}`,
  ].join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const email = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    res.json({ email });
  } catch (err) {
    console.error("[generate-email] Error:", err);
    res.status(500).json({ error: "Failed to generate email. Please try again." });
  }
});

export default router;
