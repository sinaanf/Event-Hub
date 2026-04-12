import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CONTACT_TITLES = [
  "sponsorship", "partnerships", "brand partnerships",
  "marketing director", "VP marketing", "CMO",
  "head of marketing", "head of brand",
];

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

  try {
    const apolloRes = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apolloApiKey,
      },
      body: JSON.stringify({
        "person_titles[]": CONTACT_TITLES,
        "q_organization_domains_list[]": [company_domain],
        "person_seniorities[]": ["c_suite", "vp", "head", "director"],
        per_page: 3,
      }),
    });

    const data = await apolloRes.json() as {
      people?: Array<{
        name?: string;
        title?: string;
        linkedin_url?: string;
        organization?: { name?: string };
      }>;
    };

    console.log("[find-contact] Apollo status:", apolloRes.status, "| Results:", data.people?.length ?? 0);

    if (!data.people?.length) {
      res.json({ status: "not_found" });
      return;
    }

    const contacts = data.people.slice(0, 3).map((p) => ({
      full_name: p.name || "",
      title: p.title || "",
      linkedin_url: p.linkedin_url || "",
      company: p.organization?.name || company_name,
    }));

    res.json({ status: "found", contacts });
  } catch (err) {
    console.error("[find-contact] Error:", err);
    res.status(500).json({ error: "Failed to search for contact." });
  }
});

export default router;
