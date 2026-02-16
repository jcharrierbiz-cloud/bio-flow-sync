import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export async function takePhoto(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      return image.dataUrl ?? null;
    } else {
      // Web fallback using navigator.mediaDevices
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    }
  } catch (e) {
    console.error("Camera error:", e);
    return null;
  }
}
