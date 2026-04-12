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

  console.log("[find-contact] Step 1 — looking up org ID for:", company_name);

  try {
    // Step 1: resolve organisation ID by name
    const orgParams = new URLSearchParams();
    orgParams.append("q_organization_name", company_name);
    orgParams.append("per_page", "1");
    const orgUrl = `https://api.apollo.io/api/v1/organizations/search?${orgParams.toString()}`;

    console.log("[find-contact] Org search URL:", orgUrl);
    const orgRes = await fetch(orgUrl, {
      method: "GET",
      headers: { "X-Api-Key": apolloApiKey },
    });
    const orgRawBody = await orgRes.text();
    console.log("[find-contact] Org search response status:", orgRes.status);
    console.log("[find-contact] Org search raw response:", orgRawBody);

    const orgData = JSON.parse(orgRawBody) as {
      organizations?: Array<{ id?: string; name?: string }>;
    };

    const orgId = orgData.organizations?.[0]?.id;
    if (!orgId) {
      console.log("[find-contact] No org ID found — returning not_found");
      res.json({ status: "not_found" });
      return;
    }
    console.log("[find-contact] Resolved org ID:", orgId);

    // Step 2: search contacts by org ID
    const contactsUrl = "https://api.apollo.io/api/v1/contacts/search";
    const contactsBody = { organization_ids: [orgId], per_page: 10 };

    console.log("[find-contact] Contacts search URL:", contactsUrl);
    console.log("[find-contact] Contacts search body:", JSON.stringify(contactsBody));
    const peopleRes = await fetch(contactsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apolloApiKey,
      },
      body: JSON.stringify(contactsBody),
    });
    const rawBody = await peopleRes.text();
    console.log("[find-contact] Contacts search response status:", peopleRes.status);
    console.log("[find-contact] Contacts search raw response:", rawBody);

    const data = JSON.parse(rawBody) as {
      contacts?: Array<{
        name?: string;
        title?: string;
        linkedin_url?: string;
        organization?: { name?: string };
      }>;
    };

    console.log("[find-contact] Contacts returned:", data.contacts?.length ?? 0);

    if (!data.contacts?.length) {
      res.json({ status: "not_found" });
      return;
    }

    const filtered = data.contacts
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
