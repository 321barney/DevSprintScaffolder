import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { Header } from "@/components/Header";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import PostJob from "@/pages/PostJob";
import ProviderSignup from "@/pages/ProviderSignup";
import ProviderDetail from "@/pages/ProviderDetail";
import ProviderPortfolio from "@/pages/ProviderPortfolio";
import ServicePackages from "@/pages/ServicePackages";
import CreateServicePackage from "@/pages/CreateServicePackage";
import PackageDetail from "@/pages/PackageDetail";
import Favorites from "@/pages/Favorites";
import OrderDashboard from "@/pages/OrderDashboard";
import Messages from "@/pages/Messages";
import MeetingsEvents from "@/pages/MeetingsEvents";
import Bleisure from "@/pages/Bleisure";
import Analytics from "@/pages/Analytics";
import EnterpriseSettings from "@/pages/EnterpriseSettings";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

function Router() {
  const [isBrowse] = useRoute("/browse");

  return (
    <div className={isBrowse ? "h-screen flex flex-col" : ""}>
      {!isBrowse && <Header />}
      <div className={isBrowse ? "flex-1 overflow-hidden" : ""}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/browse" component={Browse} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/jobs" component={Jobs} />
          <Route path="/jobs/:id" component={JobDetail} />
          <Route path="/post-job" component={PostJob} />
          <Route path="/provider/signup" component={ProviderSignup} />
          <Route path="/provider/:id" component={ProviderDetail} />
          <Route path="/portfolio/:providerId" component={ProviderPortfolio} />
          <Route path="/service-packages" component={ServicePackages} />
          <Route path="/service-packages/create" component={CreateServicePackage} />
          <Route path="/service-packages/:id/edit" component={CreateServicePackage} />
          <Route path="/packages/:id" component={PackageDetail} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/orders" component={OrderDashboard} />
          <Route path="/messages/:jobId?" component={Messages} />
          <Route path="/mice" component={MeetingsEvents} />
          <Route path="/bleisure" component={Bleisure} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/enterprise" component={EnterpriseSettings} />
          <Route path="/admin/audit-logs" component={AdminAuditLogs} />
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
