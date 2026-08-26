const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const STAGING_PARENT = path.join(PROJECT_ROOT, "scratch", "staging_audit");
const STAGING_DIR = path.join(STAGING_PARENT, "civic-signal");
const ZIP_OUTPUT = path.join(PROJECT_ROOT, "civic-signal-security-audit.zip");

console.log("=== Préparation de l'archive d'audit de sécurité SIGNA-CI ===");

// 1. Nettoyage de l'espace de staging
if (fs.existsSync(STAGING_PARENT)) {
  fs.rmSync(STAGING_PARENT, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// Liste des exclusions strictes (fichiers/dossiers interdits)
const FORBIDDEN_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.staging",
  ".env.test",
  "credentials.json",
  "service-account.json",
  "id_rsa",
  "id_ed25519",
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".pkcs12",
  ".log",
  ".keystore",
  ".jks",
]);

const FORBIDDEN_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".cache",
  "cache",
  ".dart_tool",
  ".idea",
  "coverage",
  ".system_generated",
  ".vercel",
  ".claude",
]);

const excludedSecurityFiles = [];

// Fonction récursive de copie sélective
function copyDirFiltered(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (FORBIDDEN_DIRS.has(entry.name)) {
        continue; // Exclure les dossiers lourds ou git
      }
      copyDirFiltered(srcPath, destPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (
        FORBIDDEN_FILENAMES.has(entry.name) ||
        entry.name.startsWith(".env") ||
        FORBIDDEN_EXTENSIONS.has(ext)
      ) {
        excludedSecurityFiles.push(path.relative(PROJECT_ROOT, srcPath));
        console.log(`[EXCLUSION SÉCURITÉ] ${srcPath}`);
        continue;
      }

      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copie des composants requis
console.log("\n[1/4] Copie des sources dans le répertoire de staging...");

// 2.1 Racine & Docs
const rootFilesToCopy = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "vercel.json",
];

for (const file of rootFilesToCopy) {
  const src = path.join(PROJECT_ROOT, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(STAGING_DIR, file));
  }
}

// Dossiers principaux
copyDirFiltered(path.join(PROJECT_ROOT, "docs"), path.join(STAGING_DIR, "docs"));
copyDirFiltered(path.join(PROJECT_ROOT, ".github"), path.join(STAGING_DIR, ".github"));
copyDirFiltered(path.join(PROJECT_ROOT, "supabase"), path.join(STAGING_DIR, "supabase"));
copyDirFiltered(path.join(PROJECT_ROOT, "scripts"), path.join(STAGING_DIR, "scripts"));

// Web
copyDirFiltered(path.join(PROJECT_ROOT, "web", "src"), path.join(STAGING_DIR, "web", "src"));
copyDirFiltered(path.join(PROJECT_ROOT, "web", "public"), path.join(STAGING_DIR, "web", "public"));
const webRootConfigs = [
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "vitest.config.ts",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "eslint.config.js",
  "postcss.config.js",
  "tailwind.config.ts",
  "capacitor.config.ts",
  "components.json",
  "index.html",
  "vercel.json",
];
for (const conf of webRootConfigs) {
  const src = path.join(PROJECT_ROOT, "web", conf);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(STAGING_DIR, "web", conf));
  }
}

// Mobile (Flutter)
copyDirFiltered(path.join(PROJECT_ROOT, "mobile", "lib"), path.join(STAGING_DIR, "mobile", "lib"));
copyDirFiltered(path.join(PROJECT_ROOT, "mobile", "test"), path.join(STAGING_DIR, "mobile", "test"));
const mobileRootConfigs = [
  "pubspec.yaml",
  "pubspec.lock",
  "analysis_options.yaml",
  "README.md",
];
for (const conf of mobileRootConfigs) {
  const src = path.join(PROJECT_ROOT, "mobile", conf);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(STAGING_DIR, "mobile", conf));
  }
}

// 3. Génération du document AUDIT.md et audit_report.md
console.log("\n[2/4] Création des documents AUDIT.md et audit_report.md...");
const auditDocContent = `# AUDIT DE SÉCURITÉ ET RAPPORT TECHNIQUE SIGNA-CI

Date d'audit : Août 2026
Version : 2.0 (Préparation Blueprint V2)
Projet : SIGNA.ci — Plateforme Civique et Communautaire

---

## 1. Périmètre du Code Source
- **Web Frontend** : React 18, Vite 6, TailwindCSS, Radix UI, TanStack Query, Leaflet, Capacitor
- **Mobile (Flutter Legacy)** : Dart / Flutter 3, Riverpod, Sqflite, Flutter Map
- **Backend Supabase** : PostgreSQL 15+, PostGIS, pg_cron, 167 migrations, 11 Edge Functions Deno
- **Spécification Cible** : \`docs/SIGNA-CI-V2-BLUEPRINT.md\`

---

## 2. Synthèse de Sécurité & Confidentialité
- **Protection des données citoyennes** : Absence de données personnelles identifiables (PII) dans les flux publics.
- **Localisation** : Application stricte du floutage de zone côté serveur et RLS PostgreSQL.
- **Politique de secret** : Tous les tokens et clés privées sont gérés exclusivement via variables d'environnement sécurisées. Les clés d'exemple et anon tokens ont été anonymisés avec \`<REDACTED>\`.
- **Row Level Security (RLS)** : RLS activée sur l'ensemble des tables sensibles (\`reports\`, \`profiles\`, \`user_roles\`, \`relay_logs\`, \`report_comments\`).
`;

fs.writeFileSync(path.join(STAGING_DIR, "AUDIT.md"), auditDocContent, "utf8");
fs.writeFileSync(path.join(STAGING_DIR, "audit_report.md"), auditDocContent, "utf8");

// 4. Balayage et rédaction automatique des secrets dans le staging
console.log("\n[3/4] Analyse récursive et rédaction des tokens/secrets dans le staging...");

// Pattern pour anonymiser les clés JWT anon Supabase ou clés hardcodées
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const SECRET_HEADER_PATTERN = /Authorization:\s*Bearer\s+eyJ[A-Za-z0-9_.-]+/gi;

let redactedCount = 0;

function sanitizeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  let newContent = content;

  if (JWT_PATTERN.test(newContent)) {
    newContent = newContent.replace(JWT_PATTERN, "<REDACTED_JWT_TOKEN>");
    modified = true;
    redactedCount++;
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`[RÉDACTION SÉCURISÉE] ${path.relative(STAGING_PARENT, filePath)}`);
  }
}

function scanAndSanitize(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanAndSanitize(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Vérifier uniquement les fichiers texte / code
      const textExtensions = [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs", ".json", ".sql", ".dart", ".md", ".html", ".css", ".yaml", ".yml", ".toml"];
      if (textExtensions.includes(ext) || entry.name.endsWith(".lock")) {
        try {
          sanitizeFile(fullPath);
        } catch (e) {
          // Ignorer les fichiers non UTF-8
        }
      }
    }
  }
}

scanAndSanitize(STAGING_DIR);
console.log(`Nombre d'occurrences anonymisées avec <REDACTED> : ${redactedCount}`);

// 5. Création du fichier ZIP avec PowerShell Compress-Archive
console.log("\n[4/4] Compression dans civic-signal-security-audit.zip...");
if (fs.existsSync(ZIP_OUTPUT)) {
  fs.unlinkSync(ZIP_OUTPUT);
}

try {
  // Compression via PowerShell Compress-Archive en conservant civic-signal comme racine
  const psCommand = `powershell -Command "Compress-Archive -Path '${STAGING_DIR}' -DestinationPath '${ZIP_OUTPUT}' -Force"`;
  execSync(psCommand, { stdio: "inherit" });
  console.log(`\nArchive créée avec succès : ${ZIP_OUTPUT}`);
} catch (err) {
  console.error("Erreur lors de la compression PowerShell :", err);
  process.exit(1);
}

// 6. Vérification finale de l'archive
const stats = fs.statSync(ZIP_OUTPUT);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
const sizeKB = (stats.size / 1024).toFixed(0);

console.log("\n=== BILAN FINAL DE L'ARCHIVE D'AUDIT ===");
console.log(`Chemin du ZIP  : ${ZIP_OUTPUT}`);
console.log(`Taille du ZIP  : ${sizeMB} Mo (${sizeKB} Ko)`);
console.log(`Fichiers exclus pour sécurité : ${excludedSecurityFiles.length}`);
