import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIZES = [192, 512];
const SOURCE_SVG = path.join(__dirname, 'client/public/icons/fairshare-icon.svg');
const OUTPUT_DIR = path.join(__dirname, 'client/public/icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate PNG icons from SVG
async function generateIcons() {
  try {
    console.log('Generating icons from SVG...');
    
    // Create each size
    for (const size of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `${size}.png`);
      
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${size}x${size} icon at ${outputPath}`);
    }
    
    console.log('Icon generation completed successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();