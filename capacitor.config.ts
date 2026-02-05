import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kidneycareplus.app',
  appName: 'KidneyCare+',
  webDir: 'out',
  server: {
    // IMPORTANT: For production, uncomment and set the URL to your deployed server
    // This is required for API routes (/api/analyze, /api/meals, etc.) to work
    // The app can use local bundled files for offline functionality, but API features need a server
    // url: 'https://your-deployed-app.vercel.app',
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
