import type { CapacitorConfig } from '@capacitor/cli'

// Set your deployed Vercel URL here for the native app to connect to API routes
const PRODUCTION_URL = process.env.CAPACITOR_SERVER_URL || 'https://kidneycare.app'

const config: CapacitorConfig = {
  appId: 'com.kidneycareplus.app',
  appName: 'KidneyCare+',
  webDir: 'out',
  server: {
    url: PRODUCTION_URL,
    androidScheme: 'https',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f7f8fa',
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false, // Disable mixed content for security
    backgroundColor: '#f7f8fa',
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
