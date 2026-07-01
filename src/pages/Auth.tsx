import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import LegalFooter from "@/components/LegalFooter";

/**
 * Auth.tsx — Connexion / inscription Bio-Flow
 * ---------------------------------------------------------------------------
 * Changements vs version précédente :
 *  - try/catch autour des appels Supabase : plus JAMAIS d'écran muet. Toute
 *    erreur (réseau, config, serveur) affiche un message + est loguée console.
 *  - setLoading(false) garanti via finally (le spinner ne reste plus bloqué).
 *  - Gère les deux cas de config Supabase :
 *      • "Confirm email" ON  → message "vérifie ton email", retour au login.
 *      • "Confirm email" OFF → session créée direct → l'app entre toute seule
 *        (le onAuthStateChange de useAuth prend le relais, pas de redirection
 *        manuelle nécessaire).
 */

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Remplis tous les champs");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Vérifie ton email avant de te connecter");
        } else if (error.message.includes("Invalid login")) {
          toast.error("Email ou mot de passe incorrect");
        } else {
          toast.error(error.message);
        }
      }
      // Succès : useAuth (onAuthStateChange) détecte la session et entre dans l'app.
    } catch (err) {
      // Erreur réseau / config : on la REND VISIBLE au lieu d'un écran muet.
      console.error("[Auth] signIn a levé une exception :", err);
      toast.error(
        "Connexion impossible : le serveur ne répond pas. Vérifie ta connexion (ou la configuration Supabase)."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Remplis tous les champs");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Si une session est déjà présente → "Confirm email" est OFF → on est
      // connecté immédiatement, l'app entre toute seule.
      if (data.session) {
        toast.success("Compte créé ! Bienvenue sur Bio-Flow 💪");
        return;
      }

      // Sinon → "Confirm email" est ON → un mail de confirmation a été envoyé.
      toast.success("Compte créé ! Vérifie ton email pour confirmer ton inscription.");
      setMode("login");
    } catch (err) {
      console.error("[Auth] signUp a levé une exception :", err);
      toast.error(
        "Inscription impossible : le serveur ne répond pas. Vérifie ta connexion (ou la configuration Supabase)."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(var(--energy)/0.06)] blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-[hsl(var(--ai-violet)/0.05)] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--energy))] to-[hsl(var(--ai-violet))] shadow-lg shadow-[hsl(var(--energy)/0.3)]">
            <Sparkles className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bio-Flow</h1>
          <p className="text-muted-foreground text-sm">
            {mode === "login" ? "Content de te revoir !" : "Crée ton compte pour commencer"}
          </p>
        </div>

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-card border-border/50 focus:border-[hsl(var(--energy))] transition-colors"
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12 bg-card border-border/50 focus:border-[hsl(var(--energy))] transition-colors"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            {mode === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 bg-card border-border/50 focus:border-[hsl(var(--energy))] transition-colors"
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-[hsl(var(--energy))] to-[hsl(var(--ai-violet))] hover:opacity-90 text-background font-semibold text-base shadow-lg shadow-[hsl(var(--energy)/0.25)] transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Se connecter" : "Créer mon compte"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "login" ? (
              <>Pas encore de compte ? <span className="text-[hsl(var(--energy))] font-medium">S'inscrire</span></>
            ) : (
              <>Déjà un compte ? <span className="text-[hsl(var(--energy))] font-medium">Se connecter</span></>
            )}
          </button>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm mt-10">
        <LegalFooter />
      </div>
    </div>
  );
};

export default Auth;
