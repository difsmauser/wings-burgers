/**
 * Script para generar iconos PWA placeholder.
 *
 * En producción, reemplazar estos iconos con los iconos reales del branding.
 * Se puede usar una herramienta como https://realfavicongenerator.net/
 * o diseñar iconos personalizados en Figma.
 *
 * Uso: node scripts/generate-icons.js
 *
 * Genera iconos SVG placeholder en public/icons/ con los tamaños requeridos
 * por el manifest.json del PWA.
 */

const fs = require('fs');
const path = require('path');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Colores del tema Wings & Burgers
const THEME_COLOR = '#EA580C'; // orange-600
const BG_COLOR = '#FFF7ED'; // orange-50

function generateSVG(size) {
  const fontSize = Math.round(size * 0.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${THEME_COLOR}"/>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${BG_COLOR}" text-anchor="middle" dominant-baseline="middle">W&B</text>
</svg>`;
}

// Create icons directory
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Generate SVG icons as placeholder (replace with PNG in production)
for (const size of ICON_SIZES) {
  const svg = generateSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(ICONS_DIR, filename), svg);
  console.log(`Generated: ${filename}`);
}

console.log('\nPlaceholder icons generated in public/icons/');
console.log('NOTE: Replace these SVG placeholders with proper PNG icons for production.');
console.log('Recommended: Use https://realfavicongenerator.net/ with your brand logo.');
