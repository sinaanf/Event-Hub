import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a B2B sponsorship strategist. Given a sponsor category, return a JSON object with: category_name, what_is_it (2-3 sentences defining the category), why_they_sponsor (2-3 sentences explaining the commercial logic for why companies in this category buy event sponsorships), example_companies (array of 6 real well-known company names in this category). Return valid JSON only, no markdown.`;

router.post("/category-intelligence", async (req, res) => {
  const { category } = req.body as { category?: string };

  if (!category?.trim()) {
    res.status(400).json({ error: "category is required" });
    return;
  }

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Sponsor category: ${category}` }],
    });

    let raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    raw = raw.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(raw);

    res.json(data);
  } catch (err) {
    console.error("[category-intelligence] Error:", err);
    res.status(500).json({ error: "Failed to fetch category intelligence." });
  }
});

export default router;
