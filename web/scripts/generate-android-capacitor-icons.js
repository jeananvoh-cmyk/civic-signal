import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resDir = path.resolve(__dirname, "../../android/app/src/main/res");

function renderSvg(svgString, width) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

// 1. SVG standard du logo officiel Signa
const fullIconSvg = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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

// 2. SVG pour ic_launcher_foreground (108dp avec marge de sécurité Android adaptive icon)
const foregroundSvg = `<svg viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fgG" x1="15" y1="15" x2="93" y2="93" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <circle cx="54" cy="54" r="36" fill="url(#fgG)" />
  <g transform="translate(54, 54) scale(0.74) translate(-50, -50)">
    <path d="M 73 27 A 33 33 0 1 0 73 73" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" fill="none" />
    <g transform="translate(50,50) rotate(45) translate(-50,-50)">
      <path d="M 44 42 C 34 37 30 29 32 15 C 32.5 13 35.5 13 38 14.5 L 43 24 C 44.5 27 47 29 50 29 C 53 29 55.5 27 57 24 L 62 14.5 C 64.5 13 67.5 13 68 15 C 70 29 66 37 56 42 L 56 74 C 56 78 53.3 81 50 81 C 46.7 81 44 78 44 74 Z M 50 71 A 3.5 3.5 0 1 0 50 78 A 3.5 3.5 0 1 0 50 71 Z" fill="#FFFFFF" fill-rule="evenodd" />
    </g>
  </g>
</svg>`;

// 3. Splash Screen SVG (Portrait & Paysage)
function getSplashSvg(width, height) {
  const isPort = height >= width;
  const logoScale = isPort ? Math.min(width * 0.35, 180) : Math.min(height * 0.35, 140);
  const cx = width / 2;
  const cy = height / 2 - 25;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#0F172A" />
    
    <!-- Glow -->
    <circle cx="${cx}" cy="${cy}" r="${logoScale * 1.4}" fill="#059669" fill-opacity="0.15" />
    
    <!-- Logo -->
    <g transform="translate(${cx - logoScale / 2}, ${cy - logoScale / 2}) scale(${logoScale / 100})">
      <defs>
        <linearGradient id="splashG" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#10B981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#splashG)" />
      <path d="M 73 27 A 33 33 0 1 0 73 73" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" fill="none" />
      <g transform="translate(50,50) rotate(45) translate(-50,-50)">
        <path d="M 44 42 C 34 37 30 29 32 15 C 32.5 13 35.5 13 38 14.5 L 43 24 C 44.5 27 47 29 50 29 C 53 29 55.5 27 57 24 L 62 14.5 C 64.5 13 67.5 13 68 15 C 70 29 66 37 56 42 L 56 74 C 56 78 53.3 81 50 81 C 46.7 81 44 78 44 74 Z M 50 71 A 3.5 3.5 0 1 0 50 78 A 3.5 3.5 0 1 0 50 71 Z" fill="#FFFFFF" fill-rule="evenodd" />
      </g>
    </g>

    <!-- Typography -->
    <text x="${cx}" y="${cy + logoScale / 2 + 40}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${Math.max(22, logoScale * 0.22)}" fill="#FFFFFF" letter-spacing="-0.5">
      SIGNA<tspan fill="#10B981">·CI</tspan>
    </text>
    <text x="${cx}" y="${cy + logoScale / 2 + 62}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${Math.max(10, logoScale * 0.085)}" fill="#94A3B8" letter-spacing="2">
      PLATEFORME CITOYENNE CIVIQUE
    </text>
  </svg>`;
}

console.log("🎨 Génération des icônes et splash screens Android Capacitor...");

// Mipmap standard icon densities
const mipmaps = [
  { folder: "mipmap-mdpi", iconSize: 48, fgSize: 108 },
  { folder: "mipmap-hdpi", iconSize: 72, fgSize: 162 },
  { folder: "mipmap-xhdpi", iconSize: 96, fgSize: 216 },
  { folder: "mipmap-xxhdpi", iconSize: 144, fgSize: 324 },
  { folder: "mipmap-xxxhdpi", iconSize: 192, fgSize: 432 },
];

for (const m of mipmaps) {
  const dir = path.join(resDir, m.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // ic_launcher.png
  const iconPng = renderSvg(fullIconSvg, m.iconSize);
  fs.writeFileSync(path.join(dir, "ic_launcher.png"), iconPng);

  // ic_launcher_round.png
  fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), iconPng);

  // ic_launcher_foreground.png
  const fgPng = renderSvg(foregroundSvg, m.fgSize);
  fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), fgPng);

  console.log(`✓ ${m.folder} généré (${m.iconSize}px & ${m.fgSize}px)`);
}

// Splash screens
const splashConfigs = [
  { folder: "drawable", w: 480, h: 800 },
  { folder: "drawable-port-mdpi", w: 320, h: 480 },
  { folder: "drawable-port-hdpi", w: 480, h: 800 },
  { folder: "drawable-port-xhdpi", w: 720, h: 1280 },
  { folder: "drawable-port-xxhdpi", w: 960, h: 1600 },
  { folder: "drawable-port-xxxhdpi", w: 1280, h: 1920 },
  { folder: "drawable-land-mdpi", w: 480, h: 320 },
  { folder: "drawable-land-hdpi", w: 800, h: 480 },
  { folder: "drawable-land-xhdpi", w: 1280, h: 720 },
  { folder: "drawable-land-xxhdpi", w: 1600, h: 960 },
  { folder: "drawable-land-xxxhdpi", w: 1920, h: 1280 },
];

for (const s of splashConfigs) {
  const dir = path.join(resDir, s.folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const splashSvg = getSplashSvg(s.w, s.h);
  const splashPng = renderSvg(splashSvg, s.w);
  fs.writeFileSync(path.join(dir, "splash.png"), splashPng);
  console.log(`✓ ${s.folder}/splash.png généré (${s.w}x${s.h})`);
}

// Update ic_launcher_background.xml in values and drawable
const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0F172A</color>
</resources>
`;
fs.writeFileSync(path.join(resDir, "values/ic_launcher_background.xml"), bgXml);

console.log("✨ Toutes les icônes et splash screens Android Capacitor sont prêts !");
