import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Lock,
  Database,
  Mail,
  Cookie,
  Trash2,
  UserCheck,
  Server,
  Download,
  ScrollText,
} from "lucide-react";
import LegalFooter from "@/components/LegalFooter";

// Adresse de contact RGPD réelle. ⚠️ Remplace-la par une adresse dédiée
// (ex. contact@bio-flow.app) si tu ne veux pas exposer ton email personnel.
const SUPPORT_EMAIL = "johan.chrr05@gmail.com";

const Section = ({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: any;
  title: string;
  id: string;
  children: React.ReactNode;
}) => (
  <section className="glass-card p-5 space-y-3" aria-labelledby={id}>
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl bg-energy/15 flex items-center justify-center"
        aria-hidden="true"
      >
        <Icon className="w-4 h-4 text-energy" />
      </div>
      <h2 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h2>
    </div>
    <div className="text-sm text-foreground/85 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Confidentialité & Sécurité — Bio-Flow";
    const desc =
      "Politique de confidentialité Bio-Flow : données collectées, sécurité (RLS, JWT, HTTPS), droits RGPD et procédure pour les exercer.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-dvh bg-background pb-20">
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy"
            aria-label="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Confidentialité & Sécurité</h1>
            <p className="text-[11px] text-muted-foreground">Mis à jour le 28 juin 2026</p>
          </div>
        </div>

        <div
          className="glass-card p-4 border border-energy/20"
          role="note"
          aria-label="Avertissement éditorial"
        >
          <p className="text-xs text-foreground/80 leading-relaxed">
            Cette page est maintenue par l'équipe Bio-Flow pour répondre aux questions
            courantes sur la confidentialité et la sécurité de l'application. Elle décrit
            les pratiques actuelles ; elle ne constitue pas une certification indépendante.
          </p>
        </div>

        {/* Table of contents for a11y/SEO */}
        <nav aria-label="Sommaire" className="glass-card p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Sommaire</p>
          <ul className="text-xs text-muted-foreground grid grid-cols-2 gap-y-1 gap-x-3">
            <li><a href="#data-collected" className="hover:text-energy">Données collectées</a></li>
            <li><a href="#data-use" className="hover:text-energy">Utilisation</a></li>
            <li><a href="#security" className="hover:text-energy">Sécurité</a></li>
            <li><a href="#hosting" className="hover:text-energy">Hébergement</a></li>
            <li><a href="#cookies" className="hover:text-energy">Cookies</a></li>
            <li><a href="#retention" className="hover:text-energy">Conservation</a></li>
            <li><a href="#rgpd" className="hover:text-energy">Droits RGPD</a></li>
            <li><a href="#contact" className="hover:text-energy">Contact</a></li>
          </ul>
        </nav>

        <Section icon={Database} title="Données que nous collectons" id="data-collected">
          <p>Bio-Flow collecte uniquement les données nécessaires au fonctionnement de l'app :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identifiants de compte (email, mot de passe haché via le fournisseur d'auth).</li>
            <li>Profil renseigné lors de l'onboarding (pseudo, âge, poids, taille, niveau sportif, objectifs).</li>
            <li>Données biologiques enregistrées : scans HR/HRV, sommeil, repas, sessions sportives, tâches d'agenda.</li>
            <li>Métadonnées techniques minimales (date des actions, identifiant d'appareil local).</li>
          </ul>
          <p>
            Les scans (fréquence cardiaque, VFC, indice de stress) sont des données de santé,
            relevant de l'article 9 du RGPD (catégorie particulière). Elles sont protégées par
            Row-Level Security et accessibles à toi seul. Aucune donnée n'est vendue à des tiers.
          </p>
        </Section>

        <Section icon={UserCheck} title="Comment nous utilisons tes données" id="data-use">
          <ul className="list-disc pl-5 space-y-1">
            <li>Calculer ton score d'énergie et tes recommandations personnalisées.</li>
            <li>Permettre au Coach IA d'analyser ton historique (14 derniers jours) pour t'orienter.</li>
            <li>Améliorer l'expérience à l'intérieur de ton compte (statistiques, gamification).</li>
          </ul>
          <p>Tes données restent associées à ton compte et ne sont pas utilisées pour entraîner des modèles tiers.</p>
        </Section>

        <Section icon={Lock} title="Sécurité appliquée" id="security">
          <ul className="list-disc pl-5 space-y-1">
            <li>Authentification gérée par notre fournisseur backend (sessions JWT, tokens rafraîchis).</li>
            <li>Vérification des mots de passe contre la base Have I Been Pwned activée.</li>
            <li>
              Row-Level Security activée sur l'ensemble des tables de données personnelles :
              chaque ligne est filtrée par <code className="text-xs text-energy">auth.uid()</code>{" "}
              et n'est lisible que par son propriétaire.
            </li>
            <li>Communications chiffrées en transit (HTTPS/TLS).</li>
            <li>Aucun accès anonyme aux tables contenant des données personnelles.</li>
          </ul>
        </Section>

        <Section icon={Server} title="Hébergement & sous-traitants" id="hosting">
          <p>Bio-Flow s'appuie sur des prestataires pour le fonctionnement de l'app :</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Lovable Cloud</strong> — hébergement base de données, authentification, fonctions serveur.</li>
            <li><strong>Lovable AI Gateway</strong> — appels aux modèles d'IA.</li>
            <li><strong>ElevenLabs</strong> — synthèse vocale de l'accueil personnalisé (optionnel, désactivable).</li>
          </ul>
        </Section>

        <Section icon={Cookie} title="Cookies & stockage local" id="cookies">
          <p>
            L'application utilise le stockage local du navigateur (localStorage) pour
            conserver ta session, tes préférences, et certains caches. Aucun cookie
            publicitaire ni traceur tiers n'est posé. Voir le{" "}
            <button
              onClick={() => navigate("/cookies")}
              className="text-energy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy rounded"
            >
              détail et les options de consentement
            </button>
            .
          </p>
        </Section>

        <Section icon={Trash2} title="Conservation & suppression" id="retention">
          <p>
            Tes données sont conservées <strong>tant que ton compte est actif</strong>. Tu peux
            supprimer ton compte et toutes tes données <strong>à tout moment et immédiatement</strong>{" "}
            depuis le menu Profil → « Supprimer mon compte ». La suppression est définitive.
          </p>
        </Section>

        {/* RGPD detailed section */}
        <Section icon={Shield} title="Tes droits RGPD" id="rgpd">
          <p>
            Bio-Flow est soumis au Règlement Général sur la Protection des Données
            (UE 2016/679). À ce titre, tu disposes des droits suivants :
          </p>

          <div className="space-y-3 mt-2">
            <article aria-labelledby="r-access" className="rounded-xl border border-border/50 p-3">
              <h3 id="r-access" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-energy" aria-hidden="true" /> Droit d'accès
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Obtenir une copie des données personnelles que nous détenons à ton sujet.
              </p>
              <p className="text-xs text-foreground/80 mt-1">
                <strong>Comment l'exercer :</strong> Profil → « Exporter mes données » télécharge
                immédiatement un fichier JSON complet de toutes tes données.
              </p>
            </article>

            <article aria-labelledby="r-rect" className="rounded-xl border border-border/50 p-3">
              <h3 id="r-rect" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-energy" aria-hidden="true" /> Droit de rectification
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Corriger toute donnée inexacte ou incomplète.
              </p>
              <p className="text-xs text-foreground/80 mt-1">
                <strong>Comment l'exercer :</strong> directement depuis le menu Profil
                (icône en haut à droite) → édite chaque champ.
              </p>
            </article>

            <article aria-labelledby="r-del" className="rounded-xl border border-border/50 p-3">
              <h3 id="r-del" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-energy" aria-hidden="true" /> Droit à l'effacement
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Demander la suppression de ton compte et de toutes tes données.
              </p>
              <p className="text-xs text-foreground/80 mt-1">
                <strong>Comment l'exercer :</strong> Profil → « Supprimer mon compte ».
                L'effacement de tes données est immédiat et définitif, sans délai d'attente.
              </p>
            </article>

            <article aria-labelledby="r-port" className="rounded-xl border border-border/50 p-3">
              <h3 id="r-port" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ScrollText className="w-3.5 h-3.5 text-energy" aria-hidden="true" /> Droit à la portabilité
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Récupérer tes données dans un format structuré et lisible (JSON).
              </p>
              <p className="text-xs text-foreground/80 mt-1">
                <strong>Comment l'exercer :</strong> Profil → « Exporter mes données ». Le fichier
                JSON obtenu est réutilisable et transférable.
              </p>
            </article>

            <article aria-labelledby="r-opp" className="rounded-xl border border-border/50 p-3">
              <h3 id="r-opp" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-energy" aria-hidden="true" /> Droit d'opposition & retrait du consentement
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Désactiver certains traitements (notifications, accueil vocal, mesure
                d'audience) à tout moment depuis le profil ou la page Cookies.
              </p>
            </article>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            En cas de difficulté, tu peux introduire une réclamation auprès de la
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-energy hover:underline ml-1"
            >
              CNIL
            </a>
            .
          </p>
        </Section>

        <Section icon={Mail} title="Contact & signalement" id="contact">
          <p>
            La plupart de tes droits s'exercent directement dans l'app (Profil → export ou
            suppression). Pour toute autre demande, question sur tes données, ou pour signaler
            une vulnérabilité, écris-nous à&nbsp;:
          </p>
          <p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Bio-Flow%20%E2%80%94%20Demande%20RGPD`}
              className="text-energy hover:underline font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-xs text-muted-foreground">
            Nous répondons aux demandes RGPD dans un délai maximal d'un mois (art. 12 RGPD).
          </p>
        </Section>

        <LegalFooter />
      </main>
    </div>
  );
};

export default Privacy;
