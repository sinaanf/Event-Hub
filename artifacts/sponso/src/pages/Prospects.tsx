export default function Prospects() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Prospects</h1>
        <p className="text-sm text-muted-foreground mb-8">
          AI-matched sponsorship prospects based on your event agenda. Review, filter, and shortlist companies to target.
        </p>

        <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No prospects yet</p>
          <p className="text-xs text-muted-foreground">Add your event agenda first and we'll generate a matched prospect list</p>
        </div>
      </div>
    </div>
  );
}
