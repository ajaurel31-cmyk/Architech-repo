import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kidneycareplus.app',
  appName: 'KidneyCare+',
  webDir: 'out',
  server: {
    // Comment out URL to use local bundled files (required for native plugins like StoreKit)
    // url: 'https://architech-repo.vercel.app',
    androidScheme: 'https',
    cleartext: false, // Disable cleartext for security
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f0f9ff',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false, // Disable mixed content for security
    backgroundColor: '#f0f9ff',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#6366f1',
    },
  },
}

export default config
