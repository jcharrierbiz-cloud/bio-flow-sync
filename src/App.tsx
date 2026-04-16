import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// @ts-ignore
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import OnboardingFlow from "@/components/OnboardingFlow";
import MorningCheckIn from "@/components/MorningCheckIn";
import FocusLock from "@/components/FocusLock";
import Home from "./pages/Home";
import Agenda from "./pages/Agenda";
import Log from "./pages/Log";
import Health from "./pages/Health";
import Coach from "./pages/Coach";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import {
  hasDoneMorningScanToday,
  getPrefs,
  scheduleAgendaReminders,
} from "@/lib/notifications";
import { isOnboardingComplete, fetchProfile } from "@/lib/profileStore";
import { useAgendaStore } from "@/lib/agendaStore";

const queryClient = new QueryClient();

const ProtectedApp = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  const [ready, setReady] = useState(false);
  const tasks = useAgendaStore((s) => s.tasks);

  useEffect(() => {
    const init = async () => {
      await fetchProfile();
      
      if (!isOnboardingComplete()) {
        setShowOnboarding(true);
      } else {
        const prefs = getPrefs();
        if (prefs.morningEnabled && !hasDoneMorningScanToday()) {
          setShowMorningCheckIn(true);
        }
      }
      setReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    const prefs = getPrefs();
    if (!prefs.enabled) return;
    const timers = scheduleAgendaReminders(tasks, prefs.reminderMinutes);
    return () => timers.forEach(clearTimeout);
  }, [tasks]);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    const prefs = getPrefs();
    if (prefs.morningEnabled && !hasDoneMorningScanToday()) {
      setTimeout(() => setShowMorningCheckIn(true), 400);
    }
  };

  if (!ready) return null;

  return (
    <>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/log" element={<Log />} />
          <Route path="/health" element={<Health />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/auth" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </div>
      <OnboardingFlow open={showOnboarding} onClose={handleOnboardingClose} />
      <MorningCheckIn open={showMorningCheckIn} onClose={() => setShowMorningCheckIn(false)} />
      <FocusLock />
    </>
  );
};

const AppContent = () => {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProtectedApp />
      </BrowserRouter>
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
