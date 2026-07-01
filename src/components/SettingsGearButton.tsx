// src/components/SettingsGearButton.tsx
// -----------------------------------------------------------------------------
// Bio-Flow — Le « rouage » ⚙️ : ouvre l'écran Réglages (/settings).
// À déposer dans n'importe quelle barre supérieure (ex. top bar de Home).
// -----------------------------------------------------------------------------

import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  className?: string;
}

const SettingsGearButton = ({ className = "" }: Props) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/settings")}
      aria-label="Ouvrir les réglages"
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-energy ${className}`}
    >
      <Settings className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

export default SettingsGearButton;
