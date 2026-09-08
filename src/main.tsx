import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/push";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker : condition nécessaire pour recevoir un rappel application
// fermée, et pour que Bio-Flow soit installable sur l'écran d'accueil.
// Enregistré après le premier rendu pour ne pas retarder l'affichage.
window.addEventListener("load", () => {
  void registerServiceWorker();
});
