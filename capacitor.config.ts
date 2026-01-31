import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.transplantfood.app',
  appName: 'TransplantFood',
  webDir: 'out',
  server: {
    // Production URL - update this to your deployed Vercel URL
    url: 'https://architech-repo.vercel.app',
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
