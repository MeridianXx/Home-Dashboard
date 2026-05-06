// Haptisk feedback för Warm Home — wrappar `@capacitor/haptics` med
// platform-check + dynamic import. I vanlig browser/PWA är allt no-op:s.
// I Björk-appen ger anropen native UIKit-haptics.

type HapticKind = "tap" | "success" | "warning" | "error" | "select";

let cachedPlatform: "ios" | "android" | "web" | null = null;

async function getPlatform() {
  if (cachedPlatform != null) return cachedPlatform;
  try {
    const { Capacitor } = await import("@capacitor/core");
    cachedPlatform = Capacitor.getPlatform() as "ios" | "android" | "web";
  } catch {
    cachedPlatform = "web";
  }
  return cachedPlatform;
}

export async function haptic(kind: HapticKind) {
  const platform = await getPlatform();
  if (platform === "web") return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import(
      "@capacitor/haptics"
    );
    if (kind === "tap") {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (kind === "select") {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } else {
      const type =
        kind === "success"
          ? NotificationType.Success
          : kind === "warning"
            ? NotificationType.Warning
            : NotificationType.Error;
      await Haptics.notification({ type });
    }
  } catch {
    // Plugin saknas eller iOS blockerar — tyst no-op.
  }
}
