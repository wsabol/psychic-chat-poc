#!/usr/bin/env node
/**
 * generate-pwa-icons.js
 * ---------------------
 * One-shot script to generate all PWA icons from the Starship Psychics logo.
 *
 * Usage:  node generate-pwa-icons.js
 *
 * Outputs to: client/public/icons/
 *   Standard sizes : 72, 96, 128, 144, 152, 180, 192, 384, 512
 *   Maskable (safe-zone-padded on #0a0a1a bg): 192, 512
 *
 * sharp is installed temporarily (--no-save) if not already present.
 */

import { execSync } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ─── Config ──────────────────────────────────────────────────────────────────

const SOURCE_PNG = path.resolve(__dirname, 'client/public/StarshipPsychics_Logo.png');
const OUTPUT_DIR = path.resolve(__dirname, 'client/public/icons');

/** Standard (purpose: "any") sizes in px */
const STANDARD_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

/** Maskable sizes — logo occupies the inner 70% (15% padding each side) */
const MASKABLE_SIZES = [192, 512];

/** Background colour for maskable icons */
const MASK_BG = { r: 10, g: 10, b: 26, alpha: 1 }; // #0a0a1a

/** Safe-zone ratio: logo fills 70% of canvas, 15% padding per side */
const SAFE_ZONE_RATIO = 0.70;

// ─── Ensure sharp is available ────────────────────────────────────────────────

function ensureSharp() {
  try {
    require.resolve('sharp');
    console.log('✔ sharp already installed.');
  } catch {
    console.log('⏳ sharp not found — installing temporarily (--no-save)…');
    execSync('npm install --no-save sharp', { stdio: 'inherit', cwd: __dirname });
    console.log('✔ sharp installed.');
  }
}

// ─── Icon generation ─────────────────────────────────────────────────────────

async function generateStandard(sharp, size) {
  const dest = path.join(OUTPUT_DIR, `icon-${size}.png`);
  await sharp(SOURCE_PNG)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent bg for standard icons
    })
    .png()
    .toFile(dest);
  console.log(`  ✔ icon-${size}.png`);
}

async function generateMaskable(sharp, size) {
  const dest = path.join(OUTPUT_DIR, `icon-${size}-maskable.png`);
  const innerSize = Math.round(size * SAFE_ZONE_RATIO);

  // 1. Resize logo to fit within the safe zone (preserve aspect ratio)
  const logoBuffer = await sharp(SOURCE_PNG)
    .resize(innerSize, innerSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 2. Composite logo centred on the solid dark background
  const padding = Math.round((size - innerSize) / 2);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: MASK_BG,
    },
  })
    .composite([{ input: logoBuffer, top: padding, left: padding }])
    .png()
    .toFile(dest);

  console.log(`  ✔ icon-${size}-maskable.png  (logo ${innerSize}px centred on ${size}px #0a0a1a canvas)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Verify source exists
  if (!fs.existsSync(SOURCE_PNG)) {
    console.error(`❌  Source file not found: ${SOURCE_PNG}`);
    process.exit(1);
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`\n📁 Output directory: ${OUTPUT_DIR}\n`);

  ensureSharp();

  // Load sharp AFTER potential install using dynamic import
  const { default: sharp } = await import('sharp');

  console.log('\n🖼  Generating standard icons…');
  for (const size of STANDARD_SIZES) {
    await generateStandard(sharp, size);
  }

  console.log('\n🎭  Generating maskable icons…');
  for (const size of MASKABLE_SIZES) {
    await generateMaskable(sharp, size);
  }

  console.log('\n✅  All PWA icons generated successfully!');
  console.log(`    Location: ${OUTPUT_DIR}\n`);
  console.log('Files created:');
  fs.readdirSync(OUTPUT_DIR)
    .sort()
    .forEach((f) => console.log(`  ${f}`));
  console.log('');
}

main().catch((err) => {
  console.error('❌  Icon generation failed:', err.message);
  process.exit(1);
});
