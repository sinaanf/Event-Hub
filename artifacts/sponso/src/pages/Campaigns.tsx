export default function Campaigns() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Campaigns</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Personalised outreach campaigns for your shortlisted sponsors. Draft, schedule, and track email sequences.
        </p>

        <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" x2="11" y1="2" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No campaigns yet</p>
          <p className="text-xs text-muted-foreground">Shortlist prospects first, then we'll help you craft personalised outreach</p>
        </div>
      </div>
    </div>
  );
}
