import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.transplantfood.app',
  appName: 'TransplantFood',
  webDir: 'out',
  server: {
    // IMPORTANT: Replace with your deployed URL before building for App Store
    // Deploy to Vercel first, then update this URL
    // Example: url: 'https://transplant-food.vercel.app'
    url: 'http://localhost:3000',
    androidScheme: 'https',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
}

export default config
