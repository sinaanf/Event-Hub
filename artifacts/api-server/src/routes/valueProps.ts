import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a sponsorship sales strategist for B2B conferences. Given an event agenda, translate each session into a sponsor-facing value proposition. For each session return: session_title, value_prop (2 sentences describing the audience and their buying intent), and sponsor_tags (array of 3 relevant sponsor category strings). Return valid JSON only, as an array of session objects, no markdown.`;

router.post("/generate-value-props", async (req, res) => {
  const { eventName, agenda } = req.body as { eventName?: string; agenda?: string };

  if (!agenda?.trim()) {
    res.status(400).json({ error: "Agenda is required" });
    return;
  }

  const userMessage = `Event: ${eventName || "Unnamed event"}\n\nAgenda:\n${agenda}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    let raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();
    const valueProps = JSON.parse(raw);

    res.json({ valueProps });
  } catch (err) {
    console.error("Claude API error:", err);
    res.status(500).json({ error: "Failed to generate value props. Please try again." });
  }
});

export default router;
