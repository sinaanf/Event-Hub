import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import AgendaInput from "@/pages/AgendaInput";
import Prospects from "@/pages/Prospects";
import Campaigns from "@/pages/Campaigns";
import Dashboard from "@/pages/Dashboard";

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
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/dashboard" component={Dashboard} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
