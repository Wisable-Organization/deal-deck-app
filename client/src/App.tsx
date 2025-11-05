import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import DealPipeline from "@/pages/DealPipeline";
import DealDetails from "@/pages/DealDetails";
import Dashboard from "@/pages/Dashboard";
import BuyingParties from "@/pages/BuyingParties";
import BuyingPartyDetail from "@/pages/BuyingPartyDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Routes>
      <Route path="/" element={<DealPipeline />} />
      <Route path="/deals/:id" element={<DealDetails />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/buying-parties" element={<BuyingParties />} />
      <Route path="/buying-parties/:id" element={<BuyingPartyDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Navigation />
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
