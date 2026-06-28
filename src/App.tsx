import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
// @ts-ignore
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import OnboardingFlow from "@/components/OnboardingFlow";
import MorningCheckIn from "@/components/MorningCheckIn";
import FocusLock from "@/components/FocusLock";
import Home from "./pages/Home";
import Agenda from "./pages/Agenda";
import Log from "./pages/Log";
import Health from "./pages/Health";
import Coach from "./pages/Coach";
import Auth from "./pages/Auth";
import Privacy from "./pages/Privacy";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import {
  hasDoneMorningScanToday,
  getPrefs,
  scheduleAgendaReminders,
} from "@/lib/notifications";
import { isOnboardingComplete, fetchProfile } from "@/lib/profileStore";
import { claimLegacyData } from "@/lib/account";
import { useAgendaStore } from "@/lib/agendaStore";

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-background"
    role="status"
    aria-label="Chargement de Bio-Flow"
  >
    <div
      className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
      style={{
        borderTopColor: "hsl(var(--energy))",
        borderRightColor: "hsl(var(--energy))",
      }}
    />
  </div>
);

const ProtectedApp = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  const [ready, setReady] = useState(false);
  const tasks = useAgendaStore((s) => s.tasks);

  useEffect(() => {
    const init = async () => {
      try {
        // Rattache les anciennes données (device_id) au compte connecté,
        // avant de charger le profil — pour que rien ne disparaisse au login.
        await claimLegacyData();
        await fetchProfile();
      } catch (err) {
        console.error("init error:", err);
      }

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

  if (!ready) return <FullScreenLoader />;

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
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <LegalFooter withBottomNav />
        <BottomNav />
      </div>
      <OnboardingFlow open={showOnboarding} onClose={handleOnboardingClose} />
      <MorningCheckIn open={showMorningCheckIn} onClose={() => setShowMorningCheckIn(false)} />
      <FocusLock />
    </>
  );
};

const AppRouter = () => {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!user) {
    // Public legal routes remain accessible; everything else falls back to Auth.
    return (
      <Routes>
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  return <ProtectedApp />;
};

const AppContent = () => {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRouter />
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
