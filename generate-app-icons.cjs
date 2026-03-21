/**
 * generate-app-icons.js
 *
 * Regenerates all Android and iOS app icons from StarshipPsychics_AppIcon.png.
 * The source image has the logo centred in a circle, but surrounded by excess
 * dark-navy background. This script:
 *   1. Locates the tight bounding-box of the actual logo pixels
 *      (non-transparent, non-dark-navy-background)
 *   2. Crops the source to that bounding-box + a small margin
 *   3. Scales the crop up and composites it onto a dark-navy circle background
 *   4. Writes every required iOS and Android icon size
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// Background colour: #0f0f1e  → RGB(15, 15, 30)
const BG = { r: 15, g: 15, b: 30 };

// --- destination paths --------------------------------------------------------
const IOS_DIR = path.join(__dirname,
  'mobile/ios/StarshipPsychicsMobile/Images.xcassets/AppIcon.appiconset');

const ANDROID_BASE = path.join(__dirname,
  'mobile/android/app/src/main/res');

const IOS_ICONS = [
  { file: 'icon-20@2x.png',  size: 40  },
  { file: 'icon-20@3x.png',  size: 60  },
  { file: 'icon-29@2x.png',  size: 58  },
  { file: 'icon-29@3x.png',  size: 87  },
  { file: 'icon-40@2x.png',  size: 80  },
  { file: 'icon-40@3x.png',  size: 120 },
  { file: 'icon-60@2x.png',  size: 120 },
  { file: 'icon-60@3x.png',  size: 180 },
  { file: 'icon-1024.png',   size: 1024 },
];

const ANDROID_ICONS = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// How far from BG colour a pixel must differ to count as "logo content"
const BG_TOLERANCE = 35;

// Extra padding to keep around the logo content (fraction of logo size)
const LOGO_PADDING_FRAC = 0.06;

// --- helpers ------------------------------------------------------------------

function isBgPixel(r, g, b, a) {
  if (a < 20) return true; // transparent → treat as background
  const dr = Math.abs(r - BG.r);
  const dg = Math.abs(g - BG.g);
  const db = Math.abs(b - BG.b);
  return (dr < BG_TOLERANCE && dg < BG_TOLERANCE && db < BG_TOLERANCE);
}

/** Build a circular-mask PNG buffer at the given size using the dark-navy BG */
async function buildCircleBackground(size) {
  const half = size / 2;
  const r    = half; // radius = half width
  // SVG circle, then rasterise via sharp
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${half}" cy="${half}" r="${r}"
            fill="rgb(${BG.r},${BG.g},${BG.b})"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// --- main ---------------------------------------------------------------------

async function run() {
  const srcPath = path.join(__dirname, 'StarshipPsychics_AppIcon.png');

  // Step 1 – raw pixel scan to find logo-content bounding box
  const { data, info } = await sharp(srcPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width, H = info.height, CH = info.channels;
  let minX = W, minY = H, maxX = 0, maxY = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * CH;
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (!isBgPixel(r, g, b, a)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const logoW = maxX - minX + 1;
  const logoH = maxY - minY + 1;

  // Step 2 – build a square crop centred on the logo with padding
  const logoSize  = Math.max(logoW, logoH);
  const padPx     = Math.round(logoSize * LOGO_PADDING_FRAC);
  const cropSize  = logoSize + padPx * 2;
  const centerX   = Math.round((minX + maxX) / 2);
  const centerY   = Math.round((minY + maxY) / 2);

  let left = centerX - Math.round(cropSize / 2);
  let top  = centerY - Math.round(cropSize / 2);
  // Clamp to image bounds
  left = Math.max(0, Math.min(W - cropSize, left));
  top  = Math.max(0, Math.min(H - cropSize, top));
  const actualCrop = Math.min(cropSize, W - left, H - top);

  // Step 3 – extract the logo crop and scale to 1024x1024
  const logoCropBuf = await sharp(srcPath)
    .extract({ left, top, width: actualCrop, height: actualCrop })
    .resize(1024, 1024, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  // Step 4 – for every size, composite the scaled logo over a dark-navy circle
  async function writeIcon(destPath, size, { opaqueBg = false } = {}) {
    // Build the circle background
    const bgBuf = await buildCircleBackground(size);

    // Scale the logo crop to the target size
    const logoBuf = await sharp(logoCropBuf)
      .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();

    // Composite logo on top of the circle background
    let pipeline = sharp(bgBuf).composite([{ input: logoBuf, blend: 'over' }]);

    if (opaqueBg) {
      // iOS 1024 marketing icon must be fully opaque
      pipeline = pipeline.flatten({ background: BG });
    }

    await pipeline.png().toFile(destPath);
  }

  // Step 5 – write iOS icons
  for (const icon of IOS_ICONS) {
    const dest = path.join(IOS_DIR, icon.file);
    const opaque = (icon.file === 'icon-1024.png');
    await writeIcon(dest, icon.size, { opaqueBg: opaque });
  }

  // Step 6 – write Android mipmap icons
  for (const icon of ANDROID_ICONS) {
    const dir = path.join(ANDROID_BASE, icon.dir);
    const launcher      = path.join(dir, 'ic_launcher.png');
    const launcherRound = path.join(dir, 'ic_launcher_round.png');
    await writeIcon(launcher,      icon.size);
    await writeIcon(launcherRound, icon.size);
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
