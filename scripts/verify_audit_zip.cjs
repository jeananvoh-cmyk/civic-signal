const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const zipPath = path.resolve(__dirname, "../civic-signal-security-audit.zip");
console.log("=== VERIFICATION DU ZIP D AUDIT ===");
console.log("Fichier cible :", zipPath);

const stats = fs.statSync(zipPath);
console.log(`Taille exacte : ${(stats.size / 1024 / 1024).toFixed(2)} Mo (${stats.size} octets)`);

const ps1Path = path.join(__dirname, "temp_verify.ps1");
const psContent = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, "/")}')
Write-Host "Nombre total d'entrees dans le ZIP :" $zip.Entries.Count

$envFiles = $zip.Entries | Where-Object { $_.FullName -like "*.env*" -or $_.FullName -like "*credentials*" -or $_.FullName -like "*.key" -or $_.FullName -like "*.pem" }
if ($envFiles) {
    Write-Host "ALERTE - Fichiers suspects trouves :"
    $envFiles | ForEach-Object { Write-Host " - " $_.FullName }
} else {
    Write-Host "CONFIRMATION : Aucun fichier .env, cle privee, credential ou certificat trouve dans l'archive."
}

Write-Host "Apercu des 25 premieres entrees :"
$zip.Entries | Select-Object -First 25 | ForEach-Object { Write-Host " - " $_.FullName }
$zip.Dispose()
`;

fs.writeFileSync(ps1Path, psContent, "utf8");
const output = execSync(`powershell -ExecutionPolicy Bypass -File "${ps1Path}"`, { encoding: "utf8" });
console.log(output);

if (fs.existsSync(ps1Path)) fs.unlinkSync(ps1Path);
