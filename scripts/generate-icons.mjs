import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const inputPath = path.join(process.cwd(), 'public/logo-raw.jpg');
const outputDir = path.join(process.cwd(), 'public');

async function generateIcons() {
    try {
        if (!fs.existsSync(inputPath)) {
            console.error('Raw logo not found at', inputPath);
            return;
        }

        // 192x192
        await sharp(inputPath)
            .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'icon-192.png'));

        // 512x512
        await sharp(inputPath)
            .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'icon-512.png'));

        // apple-icon (180x180)
        await sharp(inputPath)
            .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png()
            .toFile(path.join(outputDir, 'apple-icon.png'));

        console.log('Icons generated successfully.');
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
