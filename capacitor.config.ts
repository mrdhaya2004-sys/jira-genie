import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.36e8603f6bbe45d29c0d71033caf8782',
  appName: 'testzone-ai',
  webDir: 'dist',
  server: {
    url: 'https://36e8603f-6bbe-45d2-9c0d-71033caf8782.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    // iOS swipe-back gesture is enabled by default in WKWebView's navigation
    // and uses the same browser history stack as our navigateBack().
  },
  android: {
    // Hardware/gesture back is intercepted in src/navigation/NavigationStack.tsx
  },
};

export default config;
