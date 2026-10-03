// Downloads the built-in recipe photos from Wikimedia Commons into public/recipes/ so the app serves
// them locally instead of hotlinking (Wikimedia rate-limits bursts of hotlinked images with HTTP 429).
// Usage: node scripts/download-recipe-images.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const DATA_FILE = 'lib/mealPlannerData.ts';
const OUT_DIR = 'public/recipes';
const USER_AGENT = 'mdi-ally/0.1 (recipe image cache; local development)';

// Must match localRecipeImage() in lib/mealPlannerData.ts.
function localName(file) {
  return decodeURIComponent(file).replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.jpg';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const files = [...readFileSync(DATA_FILE, 'utf8').matchAll(/IMG\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
mkdirSync(OUT_DIR, { recursive: true });

let failed = 0;
for (const file of files) {
  const out = path.join(OUT_DIR, localName(file));
  if (existsSync(out)) continue;
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=600`;
  let ok = false;
  for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null);
    if (res?.ok) {
      writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      ok = true;
    } else {
      await sleep(2000 * attempt);
    }
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${localName(file)}`);
  if (!ok) failed++;
  await sleep(400);
}
console.log(`${files.length - failed}/${files.length} images available in ${OUT_DIR}`);
process.exit(failed ? 1 : 0);
