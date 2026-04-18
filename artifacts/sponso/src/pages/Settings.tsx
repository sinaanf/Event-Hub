import { useState, useEffect } from "react";

const PERSONAL_KEY = "sinoo_profile";
const COMPANY_KEY = "sinooprofile";

const SECTOR_OPTIONS = ["Sustainability", "Finance", "Supply Chain", "Healthcare", "Legal", "Insurance", "AI"];

type PersonalProfile = {
  fullName: string;
  jobTitle: string;
  company: string;
};

type CompanyProfile = {
  orgName: string;
  eventSector: string;
  icp: string;
  packages: string;
};

function loadPersonal(): PersonalProfile {
  try {
    const raw = localStorage.getItem(PERSONAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { fullName: "", jobTitle: "", company: "" };
}

function loadCompany(): CompanyProfile {
  try {
    const raw = localStorage.getItem(COMPANY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { orgName: "", eventSector: "", icp: "", packages: "" };
}

export function loadSenderName(): string {
  return loadPersonal().fullName;
}

export function loadCompanyProfile(): CompanyProfile {
  return loadCompany();
}

export default function Settings() {
  const [personal, setPersonal] = useState<PersonalProfile>(loadPersonal);
  const [company, setCompany] = useState<CompanyProfile>(loadCompany);
  const [saved, setSaved] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;
        setProfileId(data.id);
        const p: PersonalProfile = {
          fullName: data.user_name || "",
          jobTitle: loadPersonal().jobTitle,
          company: loadPersonal().company,
        };
        const c: CompanyProfile = {
          orgName: data.organisation_name || "",
          eventSector: data.event_sector || "",
          icp: data.icp || "",
          packages: data.sponsorship_packages || "",
        };
        setPersonal(p);
        setCompany(c);
        localStorage.setItem(PERSONAL_KEY, JSON.stringify(p));
        localStorage.setItem(COMPANY_KEY, JSON.stringify(c));
      })
      .catch((err) => console.error("[settings] profile load error:", err));
  }, []);

  function handlePersonal(field: keyof PersonalProfile, value: string) {
    setPersonal((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  function handleCompany(field: keyof CompanyProfile, value: string) {
    setCompany((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(personal));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));

    try {
      const payload = {
        id: profileId || undefined,
        organisation_name: company.orgName,
        event_sector: company.eventSector,
        icp: company.icp,
        sponsorship_packages: company.packages,
        user_name: personal.fullName,
      };
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) setProfileId(data.id);
      } else {
        console.error("[settings] profile save failed:", res.status);
      }
    } catch (err) {
      console.error("[settings] profile save error:", err);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputClass = "text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1 w-full";
  const textareaClass = `${inputClass} resize-y font-mono leading-relaxed`;

  return (
    <div className="flex-1 p-8">
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Your profile and company details personalise prospect suggestions and outreach emails.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your details</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Full name</label>
              <input
                type="text"
                value={personal.fullName}
                onChange={(e) => handlePersonal("fullName", e.target.value)}
                placeholder="e.g. Alex Johnson"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Job title</label>
              <input
                type="text"
                value={personal.jobTitle}
                onChange={(e) => handlePersonal("jobTitle", e.target.value)}
                placeholder="e.g. Head of Sponsorship"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Company</label>
              <input
                type="text"
                value={personal.company}
                onChange={(e) => handlePersonal("company", e.target.value)}
                placeholder="e.g. Acme Events"
                className={inputClass}
              />
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company profile</p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Organisation name</label>
              <input
                type="text"
                value={company.orgName}
                onChange={(e) => handleCompany("orgName", e.target.value)}
                placeholder="e.g. Global Finance Events Ltd"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Event sector</label>
              <select
                value={company.eventSector}
                onChange={(e) => handleCompany("eventSector", e.target.value)}
                className={inputClass}
              >
                <option value="">Select a sector…</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Ideal Customer Profile (ICP)</label>
              <p className="text-xs text-muted-foreground">Describe who attends your events. Claude uses this to target the right sponsors.</p>
              <textarea
                value={company.icp}
                onChange={(e) => handleCompany("icp", e.target.value)}
                placeholder="e.g. Chief Sustainability Officers at FTSE250 companies, VP of ESG at Fortune 500, Head of Corporate Affairs at global banks..."
                rows={5}
                className={textareaClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Sponsorship packages</label>
              <p className="text-xs text-muted-foreground">List your packages so Claude can reference specific offerings in outreach emails.</p>
              <textarea
                value={company.packages}
                onChange={(e) => handleCompany("packages", e.target.value)}
                placeholder={"e.g. Keynote sponsorship — £25,000\nRoundtable facilitation — £10,000\nBranded lunch — £15,000"}
                rows={5}
                className={textareaClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="text-sm px-4 py-2 rounded-md bg-[hsl(243,75%,59%)] text-white hover:bg-[hsl(243,75%,52%)] transition-colors"
            >
              Save profile
            </button>
            {saved && (
              <span className="text-xs text-emerald-600 font-medium">Saved</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
