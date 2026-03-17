import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import OnboardingModal from "@/components/OnboardingModal";
import MorningCheckIn from "@/components/MorningCheckIn";
import FocusLock from "@/components/FocusLock";
import Home from "./pages/Home";
import Agenda from "./pages/Agenda";
import Log from "./pages/Log";
import Health from "./pages/Health";
import Coach from "./pages/Coach";
import NotFound from "./pages/NotFound";
import {
  isOnboarded,
  hasDoneMorningScanToday,
  getPrefs,
  scheduleAgendaReminders,
} from "@/lib/notifications";
import { useAgendaStore } from "@/lib/agendaStore";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  const tasks = useAgendaStore((s) => s.tasks);

  useEffect(() => {
    // First launch → onboarding
    if (!isOnboarded()) {
      setShowOnboarding(true);
      return;
    }
    // Already onboarded → check morning scan
    const prefs = getPrefs();
    if (prefs.morningEnabled && !hasDoneMorningScanToday()) {
      setShowMorningCheckIn(true);
    }
  }, []);

  // Schedule agenda notifications when tasks change
  useEffect(() => {
    const prefs = getPrefs();
    if (!prefs.enabled) return;

    const timers = scheduleAgendaReminders(tasks, prefs.reminderMinutes);
    return () => timers.forEach(clearTimeout);
  }, [tasks]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // After onboarding, show morning check-in
    const prefs = getPrefs();
    if (prefs.morningEnabled && !hasDoneMorningScanToday()) {
      setTimeout(() => setShowMorningCheckIn(true), 400);
    }
  };

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/log" element={<Log />} />
            <Route path="/health" element={<Health />} />
            <Route path="/coach" element={<Coach />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
      <OnboardingModal open={showOnboarding} onClose={handleOnboardingClose} />
      <MorningCheckIn open={showMorningCheckIn} onClose={() => setShowMorningCheckIn(false)} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
