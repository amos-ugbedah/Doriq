// generate-icons.js - Run with: node generate-icons.js
// You need to install: npm install sharp

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, 'public', 'logo.svg');
const outputDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
    for (const size of sizes) {
        await sharp(inputSvg)
            .resize(size, size)
            .png()
            .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
        console.log(`Generated icon-${size}x${size}.png`);
    }
    
    // Generate favicon.ico
    await sharp(inputSvg)
        .resize(32, 32)
        .toFile(path.join(__dirname, 'public', 'favicon.ico'));
    console.log('Generated favicon.ico');
}

generateIcons().catch(console.error);