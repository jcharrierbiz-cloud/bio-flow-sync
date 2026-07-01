// src/lib/torchController.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Contrôle FORCÉ du flash (torch) pendant le scan PPG.
//
// La mesure PPG au doigt exige le flash allumé : il éclaire le tissu et rend
// les variations de volume sanguin détectables. Ce module :
//   1) ouvre (ou réutilise) la caméra arrière ;
//   2) FORCE le torch ON dès que la piste vidéo est prête, avec retries
//      (certains Android n'acceptent la contrainte qu'après le 1er frame) ;
//   3) détecte honnêtement l'absence de support (iOS/WebKit) → l'UI peut
//      afficher « Android recommandé » au lieu d'un scan silencieusement cassé.
//
// Aucune dépendance. Se branche sur le flux existant de useHeartRate.ts.
// -----------------------------------------------------------------------------

// Le type `torch` n'existe pas encore dans les lib DOM de TS → extensions locales.
interface TorchCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}
interface TorchConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

export interface TorchState {
  /** L'appareil/navigateur expose-t-il le contrôle du torch ? */
  supported: boolean;
  /** Le torch est-il actuellement allumé ? */
  enabled: boolean;
  /** Explication lisible (FR) en cas de non-support. */
  reason?: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Heuristique rapide : iOS/iPadOS + WebKit ne supportent pas le torch en PWA.
 * Sert au messaging AVANT même d'ouvrir la caméra. La vérité finale vient
 * toujours de getCapabilities() sur la piste réelle.
 */
export function isTorchLikelySupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ se présente comme un Mac tactile
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document);
  return !isIOS;
}

/** true si la piste vidéo expose la capability `torch`. */
export function trackSupportsTorch(track: MediaStreamTrack | null | undefined): boolean {
  if (!track || typeof track.getCapabilities !== "function") return false;
  const caps = track.getCapabilities() as TorchCapabilities;
  return caps?.torch === true;
}

/**
 * Ouvre la caméra arrière, réglages optimaux pour le PPG (cadence élevée,
 * résolution modeste — on n'a besoin que de la couleur moyenne).
 */
export async function openBackCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      frameRate: { ideal: 60, min: 30 },
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
  });
}

/**
 * Applique le torch (on/off) sur une piste, avec plusieurs tentatives.
 * Renvoie true si la contrainte a bien été appliquée.
 */
export async function applyTorch(track: MediaStreamTrack, on: boolean, attempts = 3): Promise<boolean> {
  if (!trackSupportsTorch(track)) return false;
  for (let i = 0; i < attempts; i++) {
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as TorchConstraintSet] });
      return true;
    } catch {
      // Android exige parfois que le flux ait produit au moins un frame.
      await sleep(200);
    }
  }
  return false;
}

/**
 * Contrôleur torch attaché à une piste vidéo. Le scan garde son propre flux
 * (celui de useHeartRate) et confie juste le flash à ce contrôleur.
 *
 * @example
 *   const torch = new TorchController();
 *   torch.attach(stream);
 *   const state = await torch.enable();      // force le flash allumé
 *   if (!state.supported) showAndroidHint(); // iOS : pas de torch
 *   // ... mesure ...
 *   await torch.disable();                   // extinction propre en fin de scan
 */
export class TorchController {
  private track: MediaStreamTrack | null = null;
  private ownsStream = false;
  private stream: MediaStream | null = null;
  private _enabled = false;

  /** Rattache une piste vidéo issue d'un flux déjà ouvert par le scan. */
  attach(source: MediaStream | MediaStreamTrack): void {
    if ("getVideoTracks" in source) {
      this.stream = source;
      this.track = source.getVideoTracks()[0] ?? null;
    } else {
      this.track = source;
    }
  }

  /** Ouvre lui-même la caméra arrière (si le scan ne fournit pas de flux). */
  async openOwnCamera(): Promise<MediaStream> {
    const stream = await openBackCamera();
    this.stream = stream;
    this.track = stream.getVideoTracks()[0] ?? null;
    this.ownsStream = true;
    return stream;
  }

  get supported(): boolean {
    return trackSupportsTorch(this.track);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** FORCE le flash allumé. Résultat honnête (supported=false sur iOS). */
  async enable(): Promise<TorchState> {
    if (!this.track) {
      return { supported: false, enabled: false, reason: "Aucune caméra active." };
    }
    if (!this.supported) {
      return {
        supported: false,
        enabled: false,
        reason: isTorchLikelySupported()
          ? "Le flash n'est pas contrôlable sur cette caméra."
          : "iOS ne permet pas d'allumer le flash dans le navigateur — utilise un appareil Android pour la mesure au doigt.",
      };
    }
    const ok = await applyTorch(this.track, true);
    this._enabled = ok;
    return ok
      ? { supported: true, enabled: true }
      : { supported: true, enabled: false, reason: "Le flash n'a pas répondu — réessaie." };
  }

  /** Éteint le flash (best-effort). */
  async disable(): Promise<void> {
    if (this.track && this.supported) {
      await applyTorch(this.track, false, 1);
    }
    this._enabled = false;
  }

  async toggle(): Promise<TorchState> {
    return this._enabled ? (await this.disable(), { supported: true, enabled: false }) : this.enable();
  }

  /**
   * Réapplique le torch s'il s'est éteint (certains appareils l'éteignent
   * après une pause/reprise). À appeler périodiquement pendant une longue mesure.
   */
  async ensureOn(): Promise<void> {
    if (this.track && this.supported && !this._enabled) {
      const ok = await applyTorch(this.track, true, 1);
      this._enabled = ok;
    }
  }

  /** Libère tout. Ferme le flux uniquement s'il a été ouvert par ce contrôleur. */
  async dispose(): Promise<void> {
    await this.disable();
    if (this.ownsStream && this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    this.track = null;
    this.stream = null;
    this.ownsStream = false;
  }
}
