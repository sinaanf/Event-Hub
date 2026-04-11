import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a B2B sponsorship sales strategist specialising in premium corporate conferences with senior executive audiences. Based on the conference session, value proposition, event name, and audience details provided, suggest 3 companies that would make strong sponsorship prospects. Follow these rules: 1) The audience is senior corporate executives — C-suite, Managing Directors, and VP level — at FTSE250 and Fortune 500 companies, so suggest enterprise vendors and professional services firms that sell to this audience, 2) Ideal prospects are large established companies with dedicated event marketing or sponsorship budgets — think Big Four consultancies, tier-one technology vendors, global financial services firms, enterprise software companies, 3) The company must have a clear and specific commercial reason to be in front of this exact senior audience at this moment, 4) Factor in event geography — suggest companies active in that market. For each company return: company_name, reason (one sentence on their specific fit), contact_role (most likely sponsorship decision maker e.g. Head of Sponsorship, VP Marketing, Head of Brand), company_size (large/enterprise), and why_now (one sentence on why this moment is right for them). Return valid JSON only as an array of 3 objects, no markdown.`;

router.post("/suggest-prospects", async (req, res) => {
  const { session_title, value_prop, sponsor_tags, eventName, eventLocation, exclusions } = req.body as {
    session_title?: string;
    value_prop?: string;
    sponsor_tags?: string[];
    eventName?: string;
    eventLocation?: string;
    exclusions?: string[];
  };

  if (!session_title || !value_prop) {
    res.status(400).json({ error: "session_title and value_prop are required" });
    return;
  }

  const userMessage = [
    eventName ? `Event: ${eventName}` : "",
    eventLocation ? `Event location: ${eventLocation}` : "",
    `Session: ${session_title}`,
    `Value proposition: ${value_prop}`,
    sponsor_tags?.length ? `Sponsor categories: ${sponsor_tags.join(", ")}` : "",
    exclusions?.length
      ? `Do not suggest any of these companies as they have already been shown: ${exclusions.join(", ")}.`
      : "",
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
