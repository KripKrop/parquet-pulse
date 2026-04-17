import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Files from "./pages/Files";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AI from "./pages/AI";
import Activity from "./pages/Activity";
import AppHeader from "./components/layout/AppHeader";
import { UploadProvider } from "./contexts/UploadContext";
import { DownloadProvider } from "./contexts/DownloadContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AIProvider } from "./contexts/AIContext";
import { TourProvider } from "./contexts/TourContext";
import { CollabProvider } from "./contexts/CollabProvider";
import { OnboardingTour } from "./components/onboarding/OnboardingTour";
import { TourAutoStart } from "./components/onboarding/TourAutoStart";
import { FloatingUploadWidget } from "./components/upload/FloatingUploadWidget";
import { FloatingDownloadWidgets } from "./components/download/FloatingDownloadWidgets";
import { CollabStatusBanner } from "./components/collab/CollabStatusBanner";
import { ProfileCompletionGate } from "./components/profile/ProfileCompletionGate";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CollabProvider>
            <AIProvider>
              <TourProvider>
              <UploadProvider>
                <DownloadProvider>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-screen"
                  >
                    <AppHeader />
                    <CollabStatusBanner />
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/files" element={<Files />} />
                        <Route path="/ai" element={<AI />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/activity" element={<Activity />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AnimatePresence>
                    <FloatingUploadWidget />
                    <FloatingDownloadWidgets />
                    <OnboardingTour />
                    <TourAutoStart />
                    <ProfileCompletionGate />
                  </motion.div>
                </DownloadProvider>
              </UploadProvider>
              </TourProvider>
            </AIProvider>
            </CollabProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
