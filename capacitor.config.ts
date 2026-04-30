import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cloud.inicio.dashboard",
  appName: "Boet",
  webDir: "out",
  server: {
    url: "https://dash.inicio.cloud",
    cleartext: false,
    allowNavigation: ["auth.inicio.cloud", "dash.inicio.cloud"],
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#FFFBF0",
    limitsNavigationsToAppBoundDomains: false,
    // Aktivera iOS edge-swipe för back/forward-navigation i WKWebView.
    allowsBackForwardNavigationGestures: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FFFBF0",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
