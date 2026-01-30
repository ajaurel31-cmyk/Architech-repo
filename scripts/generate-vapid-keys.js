#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 *
 * Run this script to generate keys:
 *   node scripts/generate-vapid-keys.js
 *
 * Then add the keys to your .env.local file:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
 *   VAPID_PRIVATE_KEY=<private_key>
 */

const webPush = require('web-push');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('\n===========================================');
console.log('  VAPID Keys Generated Successfully!');
console.log('===========================================\n');

console.log('Add these to your .env.local file:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

console.log('\n-------------------------------------------');
console.log('For Vercel deployment, add these as');
console.log('environment variables in your project settings.');
console.log('-------------------------------------------\n');
