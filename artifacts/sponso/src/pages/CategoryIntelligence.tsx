import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";

type CategoryData = {
  category_name: string;
  what_is_it: string;
  why_they_sponsor: string;
  example_companies: string[];
};

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function CategoryIntelligence() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = params.get("tag") || "";

  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    setError(null);
    setData(null);

    fetch("/api/category-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load category intelligence."))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/prospects")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Prospects
        </button>

        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-12">
            <Spinner />
            Loading category intelligence…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold text-[hsl(243,75%,59%)] uppercase tracking-wide mb-1">
                Sponsor Category
              </p>
              <h1 className="text-2xl font-semibold text-foreground">{data.category_name}</h1>
            </div>

            <div className="bg-white border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                What is this category?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.what_is_it}</p>
            </div>

            <div className="bg-white border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Why they sponsor events
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.why_they_sponsor}</p>
            </div>

            <div className="bg-white border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Example companies
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.example_companies.map((company) => (
                  <span
                    key={company}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)]"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Sector news
              </h2>
              <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground">Live sector news coming soon</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
