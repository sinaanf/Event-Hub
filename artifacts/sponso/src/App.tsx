import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { SponsoProvider } from "@/context/SponsoContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProfileProvider } from "@/context/ProfileContext";
import Campaigns from "@/pages/Campaigns";
import CategoryIntelligence from "@/pages/CategoryIntelligence";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import LiveAgenda from "@/pages/LiveAgenda";
import Login from "@/pages/Login";
import Speakers from "@/pages/Speakers";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!session) navigate("/login");
  }, [session]);

  if (!session) return null;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (session) navigate("/live-agenda");
  }, [session]);

  if (session) return null;
  return <>{children}</>;
}

function HomeRoute() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate("/live-agenda"); }, []);
  return null;
}

function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/live-agenda" component={LiveAgenda} />
          <Route path="/speakers" component={Speakers} />
          <Route path="/pipeline" component={Campaigns} />
          <Route path="/category" component={CategoryIntelligence} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/settings" component={Settings} />
          <Route>
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Page not found</p>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <RedirectIfAuthed>
          <Login />
        </RedirectIfAuthed>
      </Route>
      <Route>
        <RequireAuth>
          <ProfileProvider>
            <AppShell />
          </ProfileProvider>
        </RequireAuth>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SponsoProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </SponsoProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
