export default function Dashboard() {
  const stats = [
    { label: "Prospects identified", value: "—" },
    { label: "Campaigns active", value: "—" },
    { label: "Emails sent", value: "—" },
    { label: "Responses received", value: "—" },
  ];

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-8">
          An overview of your sponsorship pipeline — prospects, outreach activity, and campaign performance.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-white border border-border rounded-xl px-5 py-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-48 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="18" y1="20" y2="10"/>
              <line x1="12" x2="12" y1="20" y2="4"/>
              <line x1="6" x2="6" y1="20" y2="14"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Pipeline activity will appear here</p>
          <p className="text-xs text-muted-foreground">Start by adding an agenda and generating prospects</p>
        </div>
      </div>
    </div>
  );
}
