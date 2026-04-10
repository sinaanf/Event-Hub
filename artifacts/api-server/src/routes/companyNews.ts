import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXCLUDE_DOMAINS = [
  "indiatimes.com", "economictimes.com", "hindustantimes.com", "ndtv.com",
  "livemint.com", "moneycontrol.com", "businessstandard.com", "zeebiz.com",
].join(",");

const STOP_WORDS = new Set([
  "and", "the", "for", "&", "platforms", "solutions", "services",
]);

function simplifyTag(tag: string): string {
  const words = tag.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  return words.slice(0, 2).join(" ");
}

function fromDate90DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split("T")[0];
}

type RawArticle = {
  title: string;
  description: string | null;
  source: { name: string };
  publishedAt: string;
  url: string;
};

type Article = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  salesAngle: string;
};

async function getSalesAngle(
  article: { title: string; description: string | null },
  sponsorTag: string,
  eventLocation?: string
): Promise<string> {
  const locationContext = eventLocation ? ` targeting the ${eventLocation} market` : "";
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `You are a sponsorship sales strategist. In one sentence (max 25 words), explain why this news is relevant for a sponsorship salesperson pitching to companies in the "${sponsorTag}" category${locationContext}.\n\nNews: "${article.title}${article.description ? ". " + article.description : ""}"`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text.trim() : "";
}

router.post("/company-news", async (req, res) => {
  const { query, eventLocation } = req.body as { query?: string; eventLocation?: string };

  if (!query?.trim()) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  const newsApiKey = process.env.NEWS_API_KEY;
  if (!newsApiKey) {
    res.status(500).json({ error: "NEWS_API_KEY is not configured" });
    return;
  }

  const simplifiedTag = simplifyTag(query);
  console.log("[company-news] Tag simplified:", JSON.stringify(query), "→", JSON.stringify(simplifiedTag));
  const searchQuery = [simplifiedTag, eventLocation].filter(Boolean).join(" ");
  const from = fromDate90DaysAgo();

  const newsUrl = [
    "https://newsapi.org/v2/everything",
    `?q=${encodeURIComponent(searchQuery)}`,
    `&sortBy=publishedAt`,
    `&pageSize=3`,
    `&language=en`,
    `&excludeDomains=${EXCLUDE_DOMAINS}`,
    `&from=${from}`,
    `&apiKey=${newsApiKey}`,
  ].join("");

  const redactedUrl = newsUrl.replace(newsApiKey, "REDACTED");
  console.log("[company-news] NewsAPI URL:", redactedUrl);

  try {
    const newsRes = await fetch(newsUrl);
    console.log("[company-news] NewsAPI response status:", newsRes.status);

    const newsData = await newsRes.json() as {
      status: string;
      articles: RawArticle[];
    };

    const rawCount = newsData.articles?.length ?? 0;
    console.log("[company-news] Articles returned:", rawCount, "| NewsAPI status:", newsData.status);

    const debugInfo = {
      query: searchQuery,
      rawResultCount: rawCount,
      excludeDomains: EXCLUDE_DOMAINS,
    };

    if (newsData.status !== "ok" || !rawCount) {
      res.json({ articles: [], debug: debugInfo });
      return;
    }

    const top3 = newsData.articles.slice(0, 3);

    const articles: Article[] = await Promise.all(
      top3.map(async (a) => {
        const salesAngle = await getSalesAngle(
          { title: a.title, description: a.description },
          query,
          eventLocation
        );
        return {
          title: a.title,
          source: a.source.name,
          publishedAt: a.publishedAt,
          url: a.url,
          salesAngle,
        };
      })
    );

    res.json({ articles, debug: debugInfo });
  } catch (err) {
    console.error("[company-news] Error:", err);
    res.status(500).json({ error: "Failed to fetch company news." });
  }
});

export default router;
