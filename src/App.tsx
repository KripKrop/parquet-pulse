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
import AppHeader from "./components/layout/AppHeader";
import { UploadProvider } from "./contexts/UploadContext";
import { DownloadProvider } from "./contexts/DownloadContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AIProvider } from "./contexts/AIContext";
import { FloatingUploadWidget } from "./components/upload/FloatingUploadWidget";
import { FloatingDownloadWidgets } from "./components/download/FloatingDownloadWidgets";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AIProvider>
              <UploadProvider>
                <DownloadProvider>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="min-h-screen"
                  >
                    <AppHeader />
                    <AnimatePresence mode="wait">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/files" element={<Files />} />
                        <Route path="/ai" element={<AI />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/settings" element={<Settings />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AnimatePresence>
                    <FloatingUploadWidget />
                    <FloatingDownloadWidgets />
                  </motion.div>
                </DownloadProvider>
              </UploadProvider>
            </AIProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
