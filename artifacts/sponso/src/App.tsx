import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { SponsoProvider } from "@/context/SponsoContext";
import AgendaInput from "@/pages/AgendaInput";
import Prospects from "@/pages/Prospects";
import CategoryIntelligence from "@/pages/CategoryIntelligence";
import Campaigns from "@/pages/Campaigns";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Page not found</p>
    </div>
  );
}

function Router() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Switch>
          <Route path="/" component={AgendaInput} />
          <Route path="/prospects" component={Prospects} />
          <Route path="/category" component={CategoryIntelligence} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SponsoProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </SponsoProvider>
    </QueryClientProvider>
  );
}

export default App;
