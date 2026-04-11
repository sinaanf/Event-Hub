import { useState, useEffect } from "react";

const STORAGE_KEY = "sinoo_profile";

type Profile = {
  fullName: string;
  jobTitle: string;
  company: string;
};

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { fullName: "", jobTitle: "", company: "" };
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadSenderName(): string {
  return loadProfile().fullName;
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [saved, setSaved] = useState(false);

  function handleChange(field: keyof Profile, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-lg">
        <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Your profile details are used to personalise outreach emails.
        </p>

        <form onSubmit={handleSave} className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Full name</label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Job title</label>
            <input
              type="text"
              value={profile.jobTitle}
              onChange={(e) => handleChange("jobTitle", e.target.value)}
              placeholder="e.g. Head of Sponsorship"
              className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Company</label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) => handleChange("company", e.target.value)}
              placeholder="e.g. Acme Events"
              className="text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
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
