const STEPS = ["Agenda", "Value Props", "Prospects", "Outreach"];

export default function AgendaInput() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Agenda Input</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Paste your event agenda and we'll extract session topics, speakers, and themes to build your prospect targeting strategy.
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((step, i) => {
            const isActive = i === 0;
            const isComplete = false;
            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isActive
                        ? "bg-[hsl(243,75%,59%)] text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-10 h-px bg-border mx-3" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div className="bg-white border border-border rounded-xl p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="event-name">
              Event name
            </label>
            <input
              id="event-name"
              type="text"
              placeholder="e.g. FinTech Connect Europe 2025"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="agenda">
              Event agenda
            </label>
            <textarea
              id="agenda"
              rows={12}
              placeholder={`09:00 — Opening keynote: The future of embedded finance\n10:00 — Panel: Navigating AML compliance in 2025\n11:00 — Workshop: Building scalable payment infrastructure\n12:00 — Lunch break\n13:00 — Fireside chat: Open banking and the API economy\n14:00 — Deep dive: AI in fraud detection\n15:00 — Roundtable: Cross-border payments\n16:00 — Closing keynote: What's next for fintech regulation`}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:border-transparent transition resize-none leading-relaxed font-mono"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[hsl(243,75%,59%)] hover:bg-[hsl(243,75%,52%)] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-2"
            >
              Generate value props →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
