import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import OnboardingFlow from "@/components/OnboardingFlow";
import MorningCheckIn from "@/components/MorningCheckIn";
import FocusLock from "@/components/FocusLock";
import ProfileMenu from "@/components/ProfileMenu";
import Home from "./pages/Home";
import Agenda from "./pages/Agenda";
import Log from "./pages/Log";
import Health from "./pages/Health";
import Coach from "./pages/Coach";
import NotFound from "./pages/NotFound";
import {
  hasDoneMorningScanToday,
  getPrefs,
  scheduleAgendaReminders,
} from "@/lib/notifications";
import { isOnboardingComplete, fetchProfile } from "@/lib/profileStore";
import { useAgendaStore } from "@/lib/agendaStore";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  const [ready, setReady] = useState(false);
  const tasks = useAgendaStore((s) => s.tasks);

  useEffect(() => {
    const init = async () => {
      // Try to fetch profile from Supabase
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

  // Schedule agenda notifications when tasks change
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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Profile menu floating on top right */}
          {!showOnboarding && (
            <div className="fixed top-3 right-3 z-50">
              <ProfileMenu />
            </div>
          )}
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
      <OnboardingFlow open={showOnboarding} onClose={handleOnboardingClose} />
      <MorningCheckIn open={showMorningCheckIn} onClose={() => setShowMorningCheckIn(false)} />
      <FocusLock />
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
