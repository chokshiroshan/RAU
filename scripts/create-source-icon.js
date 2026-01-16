#!/usr/bin/env node
/**
 * Generate a 1024x1024 PNG icon for ContextSearch
 * Creates an abstract "C" / context logo design
 */

const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const OUTPUT_PATH = path.join(__dirname, '../assets/icon-1024.png');

// Create a gradient background with abstract C shape
async function createIcon() {
  // Create an SVG with the icon design
  const svg = `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2d2d30;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="cGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background rectangle with rounded corners -->
      <rect width="${SIZE}" height="${SIZE}" fill="url(#bgGradient)" />

      <!-- Abstract C shape -->
      <g transform="translate(${SIZE * 0.5}, ${SIZE * 0.5})">
        <!-- Outer ring (partial) -->
        <path
          d="M -200 -200
             A 280 280 0 1 0 -200 200
             L -160 160
             A 220 220 0 1 1 -160 -160
             Z"
          fill="url(#cGradient)"
          transform="scale(1.4)"
        />

        <!-- Inner accent -->
        <circle
          cx="0"
          cy="0"
          r="80"
          fill="#ffffff"
          opacity="0.15"
        />
      </g>

      <!-- Subtle glow effect -->
      <circle
        cx="${SIZE * 0.5}"
        cy="${SIZE * 0.5}"
        r="300"
        fill="url(#cGradient)"
        opacity="0.1"
      />
    </svg>
  `;

  // Convert SVG to PNG
  await sharp(Buffer.from(svg))
    .png()
    .toFile(OUTPUT_PATH);

  console.log(`Icon created at: ${OUTPUT_PATH}`);
  console.log('Now run: npm run generate-icon');
}

createIcon().catch(console.error);
