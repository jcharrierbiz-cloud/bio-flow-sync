import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Database, Mail, Cookie, Trash2, UserCheck, Server } from "lucide-react";

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass-card p-5 space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-energy/15 flex items-center justify-center">
        <Icon className="w-4 h-4 text-energy" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
      {children}
    </div>
  </section>
);

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/40 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Confidentialité & Sécurité</h1>
            <p className="text-[11px] text-muted-foreground">
              Mis à jour le 18 juin 2026
            </p>
          </div>
        </div>

        <div className="glass-card p-4 border border-energy/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cette page est maintenue par l'équipe Bio-Flow pour répondre aux questions
            courantes sur la confidentialité et la sécurité de l'application Bio-Flow.
            Elle décrit les pratiques actuelles ; elle ne constitue pas une certification
            indépendante.
          </p>
        </div>

        <Section icon={Database} title="Données que nous collectons">
          <p>Bio-Flow collecte uniquement les données nécessaires au fonctionnement de l'app :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identifiants de compte (email, mot de passe haché via le fournisseur d'auth).</li>
            <li>Profil que tu renseignes lors de l'onboarding (pseudo, âge, poids, taille, niveau sportif, objectifs).</li>
            <li>Données biologiques que tu enregistres : scans HR/HRV, sommeil, repas, sessions sportives, tâches d'agenda.</li>
            <li>Métadonnées techniques minimales (date des actions, identifiant d'appareil local).</li>
          </ul>
          <p>Aucune donnée n'est vendue à des tiers.</p>
        </Section>

        <Section icon={UserCheck} title="Comment nous utilisons tes données">
          <ul className="list-disc pl-5 space-y-1">
            <li>Calculer ton score d'énergie et tes recommandations personnalisées.</li>
            <li>Permettre au Coach IA d'analyser ton historique (14 derniers jours) pour t'orienter.</li>
            <li>Améliorer l'expérience à l'intérieur de ton compte (statistiques, gamification).</li>
          </ul>
          <p>Tes données restent associées à ton compte et ne sont pas utilisées pour entraîner des modèles tiers.</p>
        </Section>

        <Section icon={Lock} title="Sécurité appliquée">
          <ul className="list-disc pl-5 space-y-1">
            <li>Authentification gérée par notre fournisseur backend (sessions JWT, tokens rafraîchis).</li>
            <li>Vérification des mots de passe contre la base Have I Been Pwned activée.</li>
            <li>
              Row-Level Security activée sur l'ensemble des tables sensibles : chaque ligne est
              filtrée par <code className="text-xs text-energy">auth.uid()</code>, un utilisateur
              ne peut jamais lire ni modifier les données d'un autre.
            </li>
            <li>Communications chiffrées en transit (HTTPS/TLS).</li>
            <li>Aucun accès anonyme aux tables contenant des données personnelles.</li>
          </ul>
        </Section>

        <Section icon={Server} title="Hébergement & sous-traitants">
          <p>Bio-Flow s'appuie sur des prestataires pour le fonctionnement de l'app :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Lovable Cloud</strong> — hébergement de la base de données, de l'authentification et des fonctions serveur.</li>
            <li><strong>Lovable AI Gateway</strong> — appels aux modèles d'IA (analyse repas, sport, coach).</li>
            <li><strong>ElevenLabs</strong> — synthèse vocale de l'accueil personnalisé (optionnel, désactivable).</li>
          </ul>
          <p>Ces prestataires traitent les données uniquement pour fournir leur service.</p>
        </Section>

        <Section icon={Cookie} title="Cookies & stockage local">
          <p>
            L'application utilise le stockage local du navigateur (localStorage) pour
            conserver ta session, tes préférences, ton onboarding et certains caches
            (résultats de scan, analyse repas du jour). Aucun cookie publicitaire ni
            traceur tiers n'est posé.
          </p>
        </Section>

        <Section icon={Trash2} title="Conservation & suppression">
          <p>
            Tes données sont conservées <strong>tant que ton compte est actif</strong>.
            À la suppression du compte, les données associées sont supprimées des bases
            opérationnelles. Tu peux à tout moment demander la suppression de ton compte
            par email.
          </p>
        </Section>

        <Section icon={Shield} title="Tes droits (RGPD)">
          <p>Conformément au RGPD, tu disposes des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Droit d'accès et de portabilité de tes données.</li>
            <li>Droit de rectification (modifiable directement dans ton profil).</li>
            <li>Droit à l'effacement et à la limitation du traitement.</li>
            <li>Droit d'opposition et de retrait de consentement.</li>
            <li>Droit d'introduire une réclamation auprès de la CNIL.</li>
          </ul>
          <p>Pour exercer ces droits, contacte-nous par email.</p>
        </Section>

        <Section icon={Mail} title="Contact & signalement">
          <p>
            Pour toute question relative à la confidentialité ou pour signaler une
            vulnérabilité de sécurité, écris à l'équipe Bio-Flow via l'adresse de
            contact configurée dans les paramètres de publication.
          </p>
          <p className="text-xs text-muted-foreground/70 italic">
            Note : l'adresse email de contact officielle doit être renseignée par
            l'éditeur de l'application.
          </p>
        </Section>

        {/* Footer */}
        <footer className="pt-4 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} Bio-Flow — Tous droits réservés
          </p>
          <button
            onClick={() => navigate("/privacy")}
            className="text-[11px] text-energy hover:underline"
          >
            Confidentialité
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Privacy;
