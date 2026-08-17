import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, "../public");
const iconsDir = path.resolve(publicDir, "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. SVG de l'isotype officiel (clé plate de réparation + arc blanc + disque vert émeraude)
const logoSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#g)" />
  <path d="M 73 27 A 33 33 0 1 0 73 73" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" fill="none" />
  <g transform="translate(50,50) rotate(45) translate(-50,-50)">
    <path d="M 44 42 C 34 37 30 29 32 15 C 32.5 13 35.5 13 38 14.5 L 43 24 C 44.5 27 47 29 50 29 C 53 29 55.5 27 57 24 L 62 14.5 C 64.5 13 67.5 13 68 15 C 70 29 66 37 56 42 L 56 74 C 56 78 53.3 81 50 81 C 46.7 81 44 78 44 74 Z M 50 71 A 3.5 3.5 0 1 0 50 78 A 3.5 3.5 0 1 0 50 71 Z" fill="#FFFFFF" fill-rule="evenodd" />
  </g>
</svg>`;

// 2. SVG pour l'OpenGraph Image (1200x630) pour Google, réseaux sociaux, et IA
const ogSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#030D1A" />
  <circle cx="200" cy="150" r="280" fill="#059669" fill-opacity="0.15" />
  <circle cx="1050" cy="500" r="320" fill="#0284C7" fill-opacity="0.12" />

  <!-- Logo Group -->
  <g transform="translate(140, 165)">
    <defs>
      <linearGradient id="logog" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
    </defs>
    <!-- Disk -->
    <circle cx="150" cy="150" r="144" fill="url(#logog)" />
    <!-- White C ring -->
    <path d="M 219 81 A 99 99 0 1 0 219 219" stroke="#FFFFFF" stroke-width="22.5" stroke-linecap="round" fill="none" />
    <!-- Wrench at 45° -->
    <g transform="translate(150,150) rotate(45) translate(-150,-150) scale(3)">
      <path d="M 44 42 C 34 37 30 29 32 15 C 32.5 13 35.5 13 38 14.5 L 43 24 C 44.5 27 47 29 50 29 C 53 29 55.5 27 57 24 L 62 14.5 C 64.5 13 67.5 13 68 15 C 70 29 66 37 56 42 L 56 74 C 56 78 53.3 81 50 81 C 46.7 81 44 78 44 74 Z M 50 71 A 3.5 3.5 0 1 0 50 78 A 3.5 3.5 0 1 0 50 71 Z" fill="#FFFFFF" fill-rule="evenodd" />
    </g>
  </g>

  <!-- Typography -->
  <text x="500" y="270" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="100" fill="#FFFFFF" letter-spacing="-3">
    SIGNA<tspan fill="#10B981">.ci</tspan>
  </text>
  <text x="505" y="340" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="32" fill="#34D399" letter-spacing="4">
    SIGNALER · SUIVRE · RÉPARER
  </text>
  <text x="505" y="410" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="24" fill="#94A3B8">
    La plateforme citoyenne ivoirienne de signalement des coupures
  </text>
  <text x="505" y="445" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="24" fill="#94A3B8">
    d'eau (SODECI), d'électricité (CIE) et de voirie urbaine.
  </text>

  <!-- Communes tags -->
  <g transform="translate(505, 490)">
    <rect x="0" y="0" width="160" height="38" rx="19" fill="#1E293B" />
    <text x="80" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#E2E8F0">07 Communes</text>

    <rect x="175" y="0" width="130" height="38" rx="19" fill="#1E293B" />
    <text x="240" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#E2E8F0">Temps Réel</text>

    <rect x="320" y="0" width="150" height="38" rx="19" fill="#1E293B" />
    <text x="395" y="24" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="#10B981">Civic Tech CI</text>
  </g>
</svg>`;

function renderSvg(svgString, width, height) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log("🚀 Generating updated official branding PNGs...");

// Favicons
const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-48.png", size: 48 }, // Crucial for Googlebot!
  { name: "favicon-96.png", size: 96 },
  { name: "favicon-192.png", size: 192 },
  { name: "signa-logo-official.png", size: 512 },
  { name: "icons/icon-192.png", size: 192 },
  { name: "icons/icon-512.png", size: 512 },
  { name: "icons/icon-1024.png", size: 1024 },
  { name: "icons/icon-maskable.png", size: 512 },
  { name: "icons/apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  const outPath = path.resolve(publicDir, name);
  const png = renderSvg(logoSvg, size, size);
  fs.writeFileSync(outPath, png);
  console.log(`✅ Generated ${name} (${size}x${size})`);
}

// Generate favicon.ico (using 48x48 PNG data or direct buffer)
const icoPng = renderSvg(logoSvg, 48, 48);
fs.writeFileSync(path.resolve(publicDir, "favicon.ico"), icoPng);
console.log("✅ Generated favicon.ico (48x48)");

// Generate OpenGraph Social & AI Image (1200x630)
const ogPng = renderSvg(ogSvg, 1200, 630);
fs.writeFileSync(path.resolve(publicDir, "og-image.png"), ogPng);
console.log("✅ Generated og-image.png (1200x630)");

console.log("🎉 All branding assets generated successfully!");
