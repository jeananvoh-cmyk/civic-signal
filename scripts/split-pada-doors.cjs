const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'web', 'src', 'data', 'pada', 'pada-door-numbers.json');
const outDir = path.join(__dirname, '..', 'web', 'src', 'data', 'pada', 'doors');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Reading:', srcPath);
const raw = fs.readFileSync(srcPath, 'utf8');
const doors = JSON.parse(raw);
console.log(`Total doors found: ${doors.length}`);

function normalizeSlug(commune) {
  const c = (commune || '').trim().toLowerCase();
  if (c.includes('cocody')) return 'cocody';
  if (c.includes('abobo')) return 'abobo';
  if (c.includes('adjam')) return 'adjame';
  if (c.includes('att')) return 'attecoube';
  if (c.includes('bingerville')) return 'bingerville';
  if (c.includes('koumassi')) return 'koumassi';
  if (c.includes('marcory')) return 'marcory';
  if (c.includes('plateau')) return 'plateau';
  if (c.includes('port') || c.includes('bouet') || c.includes('bouët')) return 'port-bouet';
  if (c.includes('songon')) return 'songon';
  if (c.includes('treich')) return 'treichville';
  if (c.includes('yopougon')) return 'yopougon';
  if (c.includes('anyama')) return 'anyama';
  return 'autres';
}

const byCommune = {};

for (const d of doors) {
  const slug = normalizeSlug(d.commune);
  if (!byCommune[slug]) {
    byCommune[slug] = [];
  }
  byCommune[slug].push(d);
}

for (const [slug, list] of Object.entries(byCommune)) {
  const dest = path.join(outDir, `${slug}.json`);
  fs.writeFileSync(dest, JSON.stringify(list));
  console.log(`Wrote ${list.length} doors to doors/${slug}.json (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
}

console.log('Finished splitting doors successfully!');
