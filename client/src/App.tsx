import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DealPipeline from "@/pages/DealPipeline";
import DealDetails from "@/pages/DealDetails";
import Dashboard from "@/pages/Dashboard";
import BuyingParties from "@/pages/BuyingParties";
import BuyingPartyDetail from "@/pages/BuyingPartyDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import PasswordReset from "@/pages/PasswordReset";
import NotFound from "@/pages/not-found";

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/reset-password";

  return (
    <>
      {!isAuthPage && <Navigation />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DealPipeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deals/:id"
          element={
            <ProtectedRoute>
              <DealDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buying-parties"
          element={
            <ProtectedRoute>
              <BuyingParties />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buying-parties/:id"
          element={
            <ProtectedRoute>
              <BuyingPartyDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <AppContent />
          </div>
          <Toaster />
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
