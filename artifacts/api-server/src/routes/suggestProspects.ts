import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are a B2B sponsorship sales strategist specialising in premium corporate conferences with senior executive audiences. Based on the conference session, value proposition, event name, and audience details provided, suggest 3 companies that would make strong sponsorship prospects. Follow these rules: 1) The audience is senior corporate executives — C-suite, Managing Directors, and VP level — at FTSE250 and Fortune 500 companies, so suggest enterprise vendors and professional services firms that sell to this audience, 2) Ideal prospects are large established companies with dedicated event marketing or sponsorship budgets — think Big Four consultancies, tier-one technology vendors, global financial services firms, enterprise software companies, 3) The company must have a clear and specific commercial reason to be in front of this exact senior audience at this moment, 4) Factor in event geography — suggest companies active in that market. For each company return: company_name, reason (one sentence on their specific fit), contact_role (most likely sponsorship decision maker e.g. Head of Sponsorship, VP Marketing, Head of Brand), company_size (large/enterprise), why_now (one sentence on why this moment is right for them), and sponsorship_angle (one sentence suggesting what type of sponsorship package or activation would suit this company e.g. keynote sponsorship, roundtable facilitation, hosted dinner, digital branding, panel sponsorship, workshop hosting). Return valid JSON only as an array of 3 objects, no markdown.`;

router.post("/suggest-prospects", async (req, res) => {
  const { session_title, value_prop, sponsor_tags, eventName, eventLocation, exclusions, org_name, event_sector, icp, packages } = req.body as {
    session_title?: string;
    value_prop?: string;
    sponsor_tags?: string[];
    eventName?: string;
    eventLocation?: string;
    exclusions?: string[];
    org_name?: string;
    event_sector?: string;
    icp?: string;
    packages?: string;
  };

  if (!session_title || !value_prop) {
    res.status(400).json({ error: "session_title and value_prop are required" });
    return;
  }

  const NON_COMMERCIAL_KEYWORDS = ["break", "lunch", "networking", "registration", "coffee", "drinks"];
  const titleLower = session_title.toLowerCase();
  if (NON_COMMERCIAL_KEYWORDS.some((kw) => titleLower.includes(kw))) {
    res.json({ prospects: [], message: "No prospects for this session type" });
    return;
  }

  const icpClause = icp
    ? ` The event organiser's Ideal Customer Profile (the audience attending) is: ${icp}. Target companies whose customers, buyers, or decision-makers match this audience exactly.`
    : "";

  const systemPrompt = BASE_SYSTEM_PROMPT + icpClause;

  const userMessage = [
    org_name ? `Event organiser: ${org_name}` : "",
    eventName ? `Event: ${eventName}` : "",
    eventLocation ? `Event location: ${eventLocation}` : "",
    event_sector ? `Event sector: ${event_sector}` : "",
    `Session: ${session_title}`,
    `Value proposition: ${value_prop}`,
    sponsor_tags?.length ? `Sponsor categories: ${sponsor_tags.join(", ")}` : "",
    packages ? `Available sponsorship packages:\n${packages}` : "",
    exclusions?.length
      ? `Do not suggest any of these companies as they have already been shown: ${exclusions.join(", ")}.`
      : "",
  ].filter(Boolean).join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();

    let prospects;
    try {
      prospects = JSON.parse(raw);
    } catch (parseErr) {
      console.error("[suggest-prospects] JSON parse failed. Raw response:", raw);
      res.status(500).json({ error: "Failed to parse prospect suggestions. Please try again." });
      return;
    }

    res.json({ prospects });
  } catch (err) {
    console.error("[suggest-prospects] Error:", err);
    res.status(500).json({ error: "Failed to suggest prospects. Please try again." });
  }
});

export default router;
