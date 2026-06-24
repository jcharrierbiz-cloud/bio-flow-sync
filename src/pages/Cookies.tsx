import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Cookie, Settings2, Shield, BarChart3, Sparkles } from "lucide-react";
import LegalFooter from "@/components/LegalFooter";

type Consent = {
  essential: true;
  preferences: boolean;
  analytics: boolean;
};

const STORAGE_KEY = "bioflow_cookie_consent";

const defaultConsent: Consent = {
  essential: true,
  preferences: true,
  analytics: false,
};

const loadConsent = (): Consent => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultConsent, ...JSON.parse(raw) };
  } catch {}
  return defaultConsent;
};

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass-card p-5 space-y-3" aria-labelledby={`section-${title}`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-energy/15 flex items-center justify-center" aria-hidden="true">
        <Icon className="w-4 h-4 text-energy" />
      </div>
      <h2 id={`section-${title}`} className="text-base font-semibold text-foreground">
        {title}
      </h2>
    </div>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Toggle = ({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${checked ? "Désactiver" : "Activer"} ${label}`}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy ${
        checked ? "bg-energy" : "bg-secondary"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-foreground transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  </div>
);

const Cookies = () => {
  const navigate = useNavigate();
  const [consent, setConsent] = useState<Consent>(defaultConsent);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    document.title = "Cookies & consentement — Bio-Flow";
    setConsent(loadConsent());
  }, []);

  const save = (next: Consent) => {
    setConsent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-dvh bg-background pb-20">
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-8 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass-card flex items-center justify-center hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy"
            aria-label="Revenir à la page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Cookies & consentement</h1>
            <p className="text-[11px] text-muted-foreground">Mis à jour le 24 juin 2026</p>
          </div>
        </div>

        <Section icon={Cookie} title="Que sont les cookies ?">
          <p>
            Un cookie est un petit fichier déposé par le site dans ton navigateur. Bio-Flow
            utilise principalement le <strong>localStorage</strong> du navigateur (technologie
            équivalente) plutôt que de vrais cookies tiers. Aucun traceur publicitaire n'est
            posé.
          </p>
        </Section>

        <Section icon={Shield} title="Catégories de cookies utilisées">
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Essentiels</strong> — session
              d'authentification, état de navigation, sécurité. Indispensables au
              fonctionnement de l'app.
            </li>
            <li>
              <strong className="text-foreground">Préférences</strong> — onboarding,
              accueil vocal, paramètres du coach, données mises en cache pour accélérer
              l'expérience.
            </li>
            <li>
              <strong className="text-foreground">Mesure d'audience</strong> — désactivée
              par défaut. Servirait uniquement à comprendre l'usage agrégé de l'app.
            </li>
          </ul>
        </Section>

        <Section icon={Settings2} title="Tes options de consentement">
          <p>
            Tu peux ajuster tes préférences à tout moment ci-dessous. Les choix sont
            stockés localement sur ton appareil.
          </p>
          <div className="mt-2 divide-y divide-border/40" role="group" aria-label="Préférences cookies">
            <Toggle
              label="Cookies essentiels"
              description="Requis pour la connexion et la sécurité — toujours actifs."
              checked
              disabled
            />
            <Toggle
              label="Préférences & confort"
              description="Mémorise tes réglages, ton onboarding et accélère l'app."
              checked={consent.preferences}
              onChange={(v) => save({ ...consent, preferences: v })}
            />
            <Toggle
              label="Mesure d'audience"
              description="Statistiques anonymisées pour améliorer l'app."
              checked={consent.analytics}
              onChange={(v) => save({ ...consent, analytics: v })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <button
              type="button"
              onClick={() => save({ essential: true, preferences: true, analytics: true })}
              className="px-3 py-2 rounded-xl bg-energy text-background text-xs font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy"
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={() => save({ essential: true, preferences: false, analytics: false })}
              className="px-3 py-2 rounded-xl border border-border text-foreground text-xs font-medium hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy"
            >
              Tout refuser (sauf essentiels)
            </button>
            <span
              role="status"
              aria-live="polite"
              className={`text-xs self-center ${saved ? "text-energy" : "text-transparent"}`}
            >
              Préférences enregistrées
            </span>
          </div>
        </Section>

        <Section icon={BarChart3} title="Durée de conservation">
          <p>
            Les valeurs stockées localement persistent tant que tu ne vides pas le cache
            de ton navigateur ou que tu ne te déconnectes pas. Tu peux les supprimer à
            tout moment via les paramètres de ton navigateur.
          </p>
        </Section>

        <Section icon={Sparkles} title="En savoir plus">
          <p>
            Pour le détail complet du traitement de tes données (collecte, finalités,
            droits RGPD), consulte la{" "}
            <button
              onClick={() => navigate("/privacy")}
              className="text-energy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy rounded"
            >
              page Confidentialité
            </button>
            .
          </p>
        </Section>

        <LegalFooter />
      </main>
    </div>
  );
};

export default Cookies;
