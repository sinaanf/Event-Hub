import { Router, type IRouter } from "express";

const router: IRouter = Router();

const TITLE_KEYWORDS = ["sponsor", "partner", "marketing", "brand", "commercial", "cmo", "communications", "events", "director", "head", "vp", "vice president", "chief", "manager"];

router.post("/find-contact", async (req, res) => {
  const { company_name, company_domain, location } = req.body as {
    company_name?: string;
    company_domain?: string;
    location?: string;
  };

  if (!company_name || !company_domain) {
    res.status(400).json({ error: "company_name and company_domain are required" });
    return;
  }

  const hunterApiKey = process.env.HUNTER_API_KEY;
  if (!hunterApiKey) {
    res.status(500).json({ error: "HUNTER_API_KEY is not configured" });
    return;
  }

  const params = new URLSearchParams();
  params.append("domain", company_domain);
  params.append("api_key", hunterApiKey);
  params.append("limit", "10");
  params.append("seniority", "executive");
  if (location) {
    params.append("location", location);
  }
  const hunterUrl = `https://api.hunter.io/v2/domain-search?${params.toString()}`;

  console.log("[find-contact] Hunter URL:", hunterUrl);

  try {
    const hunterRes = await fetch(hunterUrl, { method: "GET" });
    const rawBody = await hunterRes.text();
    console.log("[find-contact] Hunter response status:", hunterRes.status);
    console.log("[find-contact] Hunter raw response:", rawBody);

    const data = JSON.parse(rawBody) as {
      data?: {
        emails?: Array<{
          first_name?: string;
          last_name?: string;
          position?: string;
          value?: string;
          linkedin?: string;
        }>;
      };
      errors?: Array<{ details: string }>;
    };

    if (data.errors?.length) {
      console.log("[find-contact] Hunter returned errors:", data.errors);
      res.json({ status: "not_found" });
      return;
    }

    const emails = data.data?.emails ?? [];
    console.log("[find-contact] Emails returned before filtering:", emails.length);

    const toContact = (e: { first_name?: string; last_name?: string; position?: string; value?: string; linkedin?: string }) => ({
      full_name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      title: e.position || "",
      email: e.value || "",
      linkedin_url: e.linkedin || "",
    });

    const filtered = emails
      .filter((e) => {
        const pos = (e.position || "").toLowerCase();
        return TITLE_KEYWORDS.some((kw) => pos.includes(kw));
      })
      .slice(0, 3)
      .map(toContact);

    console.log("[find-contact] Filtered matches:", filtered.length);

    if (filtered.length > 0) {
      res.json({ status: "found", contacts: filtered });
      return;
    }

    // Fallback: return top 3 regardless of title
    console.log("[find-contact] No keyword matches — falling back to top 3 results");
    const fallback = emails.slice(0, 3).map(toContact);

    if (!fallback.length) {
      res.json({ status: "not_found" });
      return;
    }

    res.json({ status: "found", contacts: fallback });
  } catch (err) {
    console.error("[find-contact] Error:", err);
    res.status(500).json({ error: "Failed to search for contact." });
  }
});

export default router;
