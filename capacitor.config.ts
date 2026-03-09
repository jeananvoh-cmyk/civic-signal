import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c34285241d024d9da6b67fc016d9de59',
  appName: 'SignalÉnergie',
  webDir: 'dist',
  server: {
    url: 'https://c3428524-1d02-4d9d-a6b6-7fc016d9de59.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a2744',
      showSpinner: false
    }
  }
};

export default config;
