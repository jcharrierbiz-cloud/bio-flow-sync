/**
 * bluetoothHeartRate.ts — Client Web Bluetooth pour capteurs de fréquence
 * cardiaque BLE (service GATT standard "Heart Rate" 0x180D).
 * ---------------------------------------------------------------------------
 * COMPATIBILITÉ (à connaître, c'est le point important) :
 *   ✅ Android : Chrome, Edge, Samsung Internet, Opera.
 *   ✅ Desktop : Chrome, Edge (Windows / macOS / Linux / ChromeOS).
 *   ❌ iOS / iPadOS : AUCUN navigateur ne supporte Web Bluetooth (Safari et
 *      tous les navigateurs iOS tournent sur WebKit → API absente).
 *      → Sur iPhone, la connexion montre doit passer par HealthKit en NATIF.
 *        Voir src/lib/healthkit.ts et INTEGRATION.md.
 *
 * CAPTEURS COMPATIBLES : tout ce qui expose le service Heart Rate standard —
 *   ceintures Polar H9/H10, Garmin HRM, Wahoo TICKR, Coospo, Magene, etc.
 *   ⚠️ L'Apple Watch NE diffuse PAS ce service à des apps tierces (données
 *      accessibles uniquement via HealthKit, en natif).
 *
 * BONUS : quand le capteur envoie les intervalles RR (la plupart des ceintures
 * le font), on récupère la VRAIE VFC (RMSSD), bien plus fiable que la caméra.
 */

// ── Typage minimal de Web Bluetooth (évite la dépendance @types/web-bluetooth) ──
type BtCharacteristic = {
  startNotifications(): Promise<BtCharacteristic>;
  stopNotifications(): Promise<BtCharacteristic>;
  addEventListener(type: "characteristicvaluechanged", cb: (e: Event) => void): void;
  removeEventListener(type: "characteristicvaluechanged", cb: (e: Event) => void): void;
  value?: DataView;
};
type BtService = { getCharacteristic(uuid: string): Promise<BtCharacteristic> };
type BtServer = {
  connect(): Promise<BtServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BtService>;
  connected: boolean;
};
type BtDevice = {
  name?: string | null;
  gatt?: BtServer;
  addEventListener(type: "gattserverdisconnected", cb: () => void): void;
  removeEventListener(type: "gattserverdisconnected", cb: () => void): void;
};
type Bluetooth = {
  requestDevice(opts: unknown): Promise<BtDevice>;
  getAvailability?(): Promise<boolean>;
};

function getBluetooth(): Bluetooth | undefined {
  return (navigator as unknown as { bluetooth?: Bluetooth }).bluetooth;
}

/** Web Bluetooth est-il disponible dans ce navigateur ? (false sur iOS) */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && !!getBluetooth();
}

export interface HeartRateSample {
  bpm: number;
  rr: number[];          // intervalles RR en ms (vide si le capteur n'en envoie pas)
  contactDetected: boolean | null; // null = capteur ne le rapporte pas
  timestamp: number;     // Date.now()
}

/**
 * Parse la caractéristique "Heart Rate Measurement" (0x2A37).
 * Format officiel Bluetooth SIG :
 *   octet 0 = flags :
 *     bit0 : format valeur FC (0 = uint8, 1 = uint16)
 *     bit1 : contact capteur détecté
 *     bit2 : contact capteur supporté
 *     bit3 : énergie dépensée présente (uint16)
 *     bit4 : intervalles RR présents (uint16 chacun, unité 1/1024 s)
 */
export function parseHeartRate(value: DataView): HeartRateSample {
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contactDetected = contactSupported ? (flags & 0x02) !== 0 : null;
  const energyPresent = (flags & 0x08) !== 0;
  const rrPresent = (flags & 0x10) !== 0;

  let index = 1;
  let bpm: number;
  if (is16) {
    bpm = value.getUint16(index, true);
    index += 2;
  } else {
    bpm = value.getUint8(index);
    index += 1;
  }
  if (energyPresent) index += 2; // on ignore l'énergie dépensée

  const rr: number[] = [];
  if (rrPresent) {
    while (index + 2 <= value.byteLength) {
      const raw = value.getUint16(index, true);
      rr.push((raw / 1024) * 1000); // → millisecondes
      index += 2;
    }
  }

  return { bpm, rr, contactDetected, timestamp: Date.now() };
}

export interface HeartRateConnection {
  deviceName: string;
  disconnect: () => void;
}

export interface ConnectCallbacks {
  onSample: (s: HeartRateSample) => void;
  onDisconnect?: () => void;
}

/**
 * Ouvre le sélecteur d'appareils, se connecte, et s'abonne au flux FC.
 * DOIT être appelé depuis un geste utilisateur (clic) — exigence navigateur.
 * Rejette avec un message clair si non supporté / annulé / échec.
 */
export async function connectHeartRateSensor(
  cb: ConnectCallbacks
): Promise<HeartRateConnection> {
  const bt = getBluetooth();
  if (!bt) {
    throw new Error(
      "Web Bluetooth non disponible sur cet appareil (impossible sur iPhone). " +
        "Utilise Android/Chrome, ou la version native pour l'Apple Watch."
    );
  }

  const device = await bt.requestDevice({
    filters: [{ services: ["heart_rate"] }],
    optionalServices: ["heart_rate"],
  });

  if (!device.gatt) throw new Error("GATT indisponible sur cet appareil.");

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService("heart_rate");
  const characteristic = await service.getCharacteristic("heart_rate_measurement");

  const handleValue = (e: Event) => {
    const target = e.target as unknown as { value?: DataView };
    if (target.value) cb.onSample(parseHeartRate(target.value));
  };
  const handleDisconnect = () => {
    characteristic.removeEventListener("characteristicvaluechanged", handleValue);
    device.removeEventListener("gattserverdisconnected", handleDisconnect);
    cb.onDisconnect?.();
  };

  characteristic.addEventListener("characteristicvaluechanged", handleValue);
  device.addEventListener("gattserverdisconnected", handleDisconnect);
  await characteristic.startNotifications();

  return {
    deviceName: device.name || "Capteur cardiaque",
    disconnect: () => {
      try {
        characteristic.removeEventListener("characteristicvaluechanged", handleValue);
      } catch { /* noop */ }
      try {
        if (server.connected) server.disconnect(); // déclenche gattserverdisconnected
        else handleDisconnect();
      } catch {
        handleDisconnect();
      }
    },
  };
}
