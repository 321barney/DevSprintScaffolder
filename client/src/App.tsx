import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { Header } from "@/components/Header";
import Marketplace from "@/pages/marketplace";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import PostJob from "@/pages/PostJob";
import ProviderSignup from "@/pages/ProviderSignup";
import Messages from "@/pages/Messages";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

function Router() {
  const [isMarketplace] = useRoute("/");

  return (
    <div className={isMarketplace ? "h-screen flex flex-col" : ""}>
      {!isMarketplace && <Header />}
      <div className={isMarketplace ? "flex-1 overflow-hidden" : ""}>
        <Switch>
          <Route path="/" component={Marketplace} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/jobs/:id" component={JobDetail} />
          <Route path="/post-job" component={PostJob} />
          <Route path="/provider/signup" component={ProviderSignup} />
          <Route path="/messages/:jobId?" component={Messages} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Router />
          </div>
          <Toaster />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
