#!/usr/bin/env node

/**
 * Generate iOS App Icons from a source image
 *
 * Usage: node scripts/generate-ios-icons.js [source-image]
 *
 * If no source image provided, uses public/icon-512.png
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// iOS App Icon sizes required for App Store submission
const IOS_ICON_SIZES = [
  // iPhone Notification
  { size: 20, scales: [2, 3], name: 'Icon-App-20x20' },
  // iPhone Settings
  { size: 29, scales: [2, 3], name: 'Icon-App-29x29' },
  // iPhone Spotlight
  { size: 40, scales: [2, 3], name: 'Icon-App-40x40' },
  // iPhone App
  { size: 60, scales: [2, 3], name: 'Icon-App-60x60' },
  // iPad Notification
  { size: 20, scales: [1, 2], name: 'Icon-App-20x20', platform: 'ipad' },
  // iPad Settings
  { size: 29, scales: [1, 2], name: 'Icon-App-29x29', platform: 'ipad' },
  // iPad Spotlight
  { size: 40, scales: [1, 2], name: 'Icon-App-40x40', platform: 'ipad' },
  // iPad App
  { size: 76, scales: [1, 2], name: 'Icon-App-76x76' },
  // iPad Pro App
  { size: 83.5, scales: [2], name: 'Icon-App-83.5x83.5' },
  // App Store
  { size: 1024, scales: [1], name: 'ItunesArtwork' },
];

async function generateIcons(sourceImage) {
  const outputDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating iOS App Icons...\n');

  const contentsJson = {
    images: [],
    info: {
      author: 'xcode',
      version: 1
    }
  };

  for (const icon of IOS_ICON_SIZES) {
    for (const scale of icon.scales) {
      const pixelSize = Math.round(icon.size * scale);
      const filename = `${icon.name}@${scale}x.png`;
      const outputPath = path.join(outputDir, filename);

      try {
        await sharp(sourceImage)
          .resize(pixelSize, pixelSize, {
            fit: 'cover',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toFile(outputPath);

        console.log(`✓ Generated ${filename} (${pixelSize}x${pixelSize})`);

        // Add to Contents.json
        const imageEntry = {
          filename: filename,
          idiom: icon.platform === 'ipad' ? 'ipad' : 'iphone',
          scale: `${scale}x`,
          size: `${icon.size}x${icon.size}`
        };

        // App Store icon is universal
        if (icon.size === 1024) {
          imageEntry.idiom = 'ios-marketing';
        }

        contentsJson.images.push(imageEntry);
      } catch (error) {
        console.error(`✗ Failed to generate ${filename}:`, error.message);
      }
    }
  }

  // Also generate universal icons for newer Xcode
  const universalSizes = [1024];
  for (const size of universalSizes) {
    const filename = `AppIcon-${size}.png`;
    const outputPath = path.join(outputDir, filename);

    try {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${filename}:`, error.message);
    }
  }

  // Write Contents.json
  const contentsPath = path.join(outputDir, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
  console.log(`\n✓ Generated Contents.json`);

  console.log(`\n✅ iOS App Icons generated in: ${outputDir}`);
  console.log('\nNext steps:');
  console.log('1. Run: npx cap sync ios');
  console.log('2. Run: npx cap open ios');
  console.log('3. Build and submit to App Store');
}

// Main
const sourceImage = process.argv[2] || path.join(__dirname, '..', 'public', 'icon-512.png');

if (!fs.existsSync(sourceImage)) {
  console.error(`Error: Source image not found: ${sourceImage}`);
  console.error('\nUsage: node scripts/generate-ios-icons.js [source-image]');
  console.error('\nProvide a 1024x1024 PNG image for best results.');
  process.exit(1);
}

console.log(`Source image: ${sourceImage}\n`);

generateIcons(sourceImage).catch(error => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
