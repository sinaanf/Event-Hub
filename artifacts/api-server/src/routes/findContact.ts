import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/find-contact", async (req, res) => {
  const { company_name, company_domain, contact_role } = req.body as {
    company_name?: string;
    company_domain?: string;
    contact_role?: string;
  };

  if (!company_name || !company_domain || !contact_role) {
    res.status(400).json({ error: "company_name, company_domain, and contact_role are required" });
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
        "person_titles[]": [contact_role],
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

    const top = data.people[0];
    res.json({
      status: "found",
      full_name: top.name || "",
      title: top.title || "",
      linkedin_url: top.linkedin_url || "",
      company: top.organization?.name || company_name,
    });
  } catch (err) {
    console.error("[find-contact] Error:", err);
    res.status(500).json({ error: "Failed to search for contact." });
  }
});

export default router;
