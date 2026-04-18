import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { signIn, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setLocation("/");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-2xl font-semibold tracking-tight text-foreground">sinoo</span>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="text-sm border border-gray-200 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="text-sm border border-gray-200 rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[hsl(243,75%,59%)] focus:ring-offset-1"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="mt-1 w-full py-2.5 rounded-md bg-[hsl(243,75%,59%)] text-white text-sm font-medium hover:bg-[hsl(243,75%,52%)] disabled:opacity-60 transition-colors"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
