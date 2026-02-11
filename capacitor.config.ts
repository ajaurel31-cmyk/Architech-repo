import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL =
  process.env.CAPACITOR_SERVER_URL || 'https://goutguard.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.goutguard.app',
  appName: 'GoutGuard',
  webDir: 'out',
  server: {
    url: PRODUCTION_URL,
    androidScheme: 'https',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f8f9fa',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f8f9fa',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1a56db',
    },
  },
};

export default config;
