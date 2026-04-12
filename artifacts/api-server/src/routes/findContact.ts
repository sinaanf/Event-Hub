import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/find-contact", async (req, res) => {
  const { company_name, company_domain } = req.body as {
    company_name?: string;
    company_domain?: string;
  };

  if (!company_name || !company_domain) {
    res.status(400).json({ error: "company_name and company_domain are required" });
    return;
  }

  const apolloApiKey = process.env.APOLLO_API_KEY;
  if (!apolloApiKey) {
    res.status(500).json({ error: "APOLLO_API_KEY is not configured" });
    return;
  }

  const TITLE_KEYWORDS = ["sponsor", "partner", "marketing", "brand", "commercial", "cmo", "communications"];

  const apolloUrl = `https://api.apollo.io/api/v1/mixed_people/organization_top_people?q_organization_domains_list[]=${encodeURIComponent(company_domain)}`;

  console.log("[find-contact] Company domain:", company_domain);
  console.log("[find-contact] Apollo URL:", apolloUrl);

  try {
    const apolloRes = await fetch(apolloUrl, {
      method: "GET",
      headers: {
        "X-Api-Key": apolloApiKey,
      },
    });

    const rawBody = await apolloRes.text();
    console.log("[find-contact] Apollo response status:", apolloRes.status);
    console.log("[find-contact] Apollo raw response body:", rawBody);

    const data = JSON.parse(rawBody) as {
      people?: Array<{
        name?: string;
        title?: string;
        linkedin_url?: string;
        organization?: { name?: string };
      }>;
    };

    console.log("[find-contact] People returned:", data.people?.length ?? 0);

    if (!data.people?.length) {
      res.json({ status: "not_found" });
      return;
    }

    const filtered = data.people
      .filter((p) => {
        const t = (p.title || "").toLowerCase();
        return TITLE_KEYWORDS.some((kw) => t.includes(kw));
      })
      .slice(0, 3)
      .map((p) => ({
        full_name: p.name || "",
        title: p.title || "",
        linkedin_url: p.linkedin_url || "",
        company: p.organization?.name || company_name,
      }));

    if (!filtered.length) {
      res.json({ status: "not_found" });
      return;
    }

    res.json({ status: "found", contacts: filtered });
  } catch (err) {
    console.error("[find-contact] Error:", err);
    res.status(500).json({ error: "Failed to search for contact." });
  }
});

export default router;
