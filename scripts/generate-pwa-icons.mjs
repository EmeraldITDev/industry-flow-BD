/**
 * Generates PWA icons from src/assets/emerald-logo.png.
 * Run: npm run pwa:icons
 */
import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const logoPath = join(root, 'src/assets/emerald-logo.png');
const publicDir = join(root, 'public');

/** Sidebar teal — matches manifest background_color */
const BG = { r: 15, g: 74, b: 92, alpha: 1 };

async function icon(size, maskable) {
  const filename = maskable
    ? `pwa-${size}x${size}-maskable.png`
    : `pwa-${size}x${size}.png`;

  // Maskable safe zone ≈ 80% diameter; logo fits inside ~60% of canvas.
  const logoScale = maskable ? 0.55 : 0.72;
  const logoSize = Math.round(size * logoScale);

  const logo = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(join(publicDir, filename));

  console.log(`  ✓ ${filename}`);
}

console.log('Generating PWA icons from emerald-logo.png…');
for (const size of [192, 512]) {
  await icon(size, false);
  await icon(size, true);
}
console.log('Done.');
