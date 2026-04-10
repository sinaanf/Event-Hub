export default function AgendaInput() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Agenda Input</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Paste your event agenda and we'll extract session topics, speakers, and themes to build your prospect targeting strategy.
        </p>

        <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
              <line x1="16" x2="16" y1="2" y2="6"/>
              <line x1="8" x2="8" y1="2" y2="6"/>
              <line x1="3" x2="21" y1="10" y2="10"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">Agenda input coming soon</p>
          <p className="text-xs text-muted-foreground">Paste your agenda or upload a file to get started</p>
        </div>
      </div>
    </div>
  );
}
