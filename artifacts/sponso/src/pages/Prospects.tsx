import { useSponso } from "@/context/SponsoContext";
import { useLocation } from "wouter";

const STEPS = ["Agenda", "Value Props", "Prospects", "Outreach"];

export default function Prospects() {
  const { valueProps, eventName } = useSponso();
  const [, navigate] = useLocation();

  return (
    <div className="flex-1 p-8">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold text-foreground mb-1">Value Props</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {eventName
            ? `Sponsor-facing value propositions for ${eventName}.`
            : "Sponsor-facing value propositions extracted from your agenda."}
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((step, i) => {
            const isActive = i === 1;
            const isComplete = i === 0;
            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                      isComplete
                        ? "bg-[hsl(243,75%,59%)] text-white"
                        : isActive
                        ? "bg-[hsl(243,75%,59%)] text-white"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-sm ${isActive ? "text-foreground font-medium" : isComplete ? "text-muted-foreground" : "text-muted-foreground"}`}>
                    {step}
                  </span>
                </div>
                {i < STEPS.length - 1 && <div className="w-10 h-px bg-border mx-3" />}
              </div>
            );
          })}
        </div>

        {valueProps.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-64 text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(243,75%,97%)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(243,75%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No value props yet</p>
            <p className="text-xs text-muted-foreground mb-2">Add your event agenda first and we'll generate value propositions for each session.</p>
            <button
              onClick={() => navigate("/")}
              className="text-xs text-[hsl(243,75%,59%)] hover:underline"
            >
              ← Back to Agenda Input
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {valueProps.map((vp, i) => (
              <div key={i} className="bg-white border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{vp.session_title}</h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{vp.value_prop}</p>
                <div className="flex flex-wrap gap-1.5">
                  {vp.sponsor_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-[hsl(243,75%,97%)] text-[hsl(243,75%,40%)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
