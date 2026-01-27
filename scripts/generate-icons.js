// Run this script to generate PNG icons from the SVG
// Requires: npm install sharp
// Usage: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const svgPath = path.join(__dirname, '../public/icon.svg');
    const svg = fs.readFileSync(svgPath);

    // Generate 192x192 icon
    await sharp(svg)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/icon-192.png'));
    console.log('Created icon-192.png');

    // Generate 512x512 icon
    await sharp(svg)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/icon-512.png'));
    console.log('Created icon-512.png');

    // Generate Apple touch icon (180x180)
    await sharp(svg)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('Created apple-touch-icon.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Installing sharp...');
      require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
      console.log('Please run this script again.');
    } else {
      console.error('Error generating icons:', error);
    }
  }
}

generateIcons();
