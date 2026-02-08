#!/usr/bin/env node

/**
 * Generate Android App Icons from a source image
 *
 * Usage: node scripts/generate-android-icons.js [source-image]
 *
 * If no source image provided, uses public/icon-512.png
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android icon sizes for different screen densities
const ANDROID_ICON_SIZES = [
  { density: 'mdpi', size: 48 },
  { density: 'hdpi', size: 72 },
  { density: 'xhdpi', size: 96 },
  { density: 'xxhdpi', size: 144 },
  { density: 'xxxhdpi', size: 192 },
];

// Foreground icon sizes (adaptive icons - slightly larger)
const ANDROID_FOREGROUND_SIZES = [
  { density: 'mdpi', size: 108 },
  { density: 'hdpi', size: 162 },
  { density: 'xhdpi', size: 216 },
  { density: 'xxhdpi', size: 324 },
  { density: 'xxxhdpi', size: 432 },
];

async function generateIcons(sourceImage) {
  const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

  console.log('Generating Android App Icons...\n');

  // Generate launcher icons
  for (const icon of ANDROID_ICON_SIZES) {
    const outputDir = path.join(resDir, `mipmap-${icon.density}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'ic_launcher.png');
    const roundPath = path.join(outputDir, 'ic_launcher_round.png');

    try {
      // Regular launcher icon
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated mipmap-${icon.density}/ic_launcher.png (${icon.size}x${icon.size})`);

      // Round launcher icon
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(roundPath);

      console.log(`✓ Generated mipmap-${icon.density}/ic_launcher_round.png (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate mipmap-${icon.density} icons:`, error.message);
    }
  }

  // Generate foreground icons for adaptive icons
  console.log('\nGenerating adaptive icon foregrounds...\n');

  for (const icon of ANDROID_FOREGROUND_SIZES) {
    const outputDir = path.join(resDir, `mipmap-${icon.density}`);
    const outputPath = path.join(outputDir, 'ic_launcher_foreground.png');

    try {
      await sharp(sourceImage)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 45, g: 134, b: 89, alpha: 1 } // Match the green background
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated mipmap-${icon.density}/ic_launcher_foreground.png (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate foreground for ${icon.density}:`, error.message);
    }
  }

  // Generate Play Store icon (512x512)
  const playStoreDir = path.join(resDir, 'playstore');
  if (!fs.existsSync(playStoreDir)) {
    fs.mkdirSync(playStoreDir, { recursive: true });
  }

  try {
    await sharp(sourceImage)
      .resize(512, 512, {
        fit: 'cover',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(playStoreDir, 'ic_launcher-playstore.png'));

    console.log(`\n✓ Generated playstore/ic_launcher-playstore.png (512x512)`);
  } catch (error) {
    console.error('✗ Failed to generate Play Store icon:', error.message);
  }

  console.log(`\n✅ Android App Icons generated in: ${resDir}`);
  console.log('\nNext steps:');
  console.log('1. Run: npx cap sync android');
  console.log('2. Run: npx cap open android');
  console.log('3. Build and submit to Play Store');
}

// Main
const sourceImage = process.argv[2] || path.join(__dirname, '..', 'public', 'icon-512.png');

if (!fs.existsSync(sourceImage)) {
  console.error(`Error: Source image not found: ${sourceImage}`);
  console.error('\nUsage: node scripts/generate-android-icons.js [source-image]');
  console.error('\nProvide a 512x512 or larger PNG image for best results.');
  process.exit(1);
}

console.log(`Source image: ${sourceImage}\n`);

generateIcons(sourceImage).catch(error => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
