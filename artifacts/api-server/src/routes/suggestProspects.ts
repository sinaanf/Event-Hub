import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a B2B sponsorship sales strategist. Based on this conference session and its sponsor-facing value proposition, suggest 3 real companies that would make strong sponsorship prospects. For each company return: company_name, reason (one sentence explaining why they are a strong fit), contact_role (the job title most likely to own sponsorship decisions e.g. Head of Partnerships, VP Marketing, CMO). Return valid JSON only as an array of 3 objects, no markdown.`;

router.post("/suggest-prospects", async (req, res) => {
  const { session_title, value_prop, sponsor_tags } = req.body as {
    session_title?: string;
    value_prop?: string;
    sponsor_tags?: string[];
  };

  if (!session_title || !value_prop) {
    res.status(400).json({ error: "session_title and value_prop are required" });
    return;
  }

  const userMessage = [
    `Session: ${session_title}`,
    `Value proposition: ${value_prop}`,
    sponsor_tags?.length ? `Sponsor categories: ${sponsor_tags.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    let raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    const prospects = JSON.parse(raw);

    res.json({ prospects });
  } catch (err) {
    console.error("[suggest-prospects] Error:", err);
    res.status(500).json({ error: "Failed to suggest prospects. Please try again." });
  }
});

export default router;
