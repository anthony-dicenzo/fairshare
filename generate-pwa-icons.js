import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Make sure our output directories exist
const iconDir = path.join('client', 'public', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Source SVG file
const svgPath = path.join('client', 'src', 'assets', 'fairshare-icon.svg');

// The sizes we need to generate
const sizes = [192, 512];

async function generatePWAIcons() {
  console.log('Generating PWA icons from SVG...');
  
  try {
    for (const size of sizes) {
      const outputPath = path.join(iconDir, `${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${size}x${size} icon at ${outputPath}`);
    }
    
    console.log('All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating PWA icons:', error);
    process.exit(1);
  }
}

generatePWAIcons();