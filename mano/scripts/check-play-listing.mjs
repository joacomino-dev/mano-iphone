// Checks docs/playstore/listing.md against Google Play's limits: title ≤ 30,
// short description ≤ 80, full description ≤ 4000 characters (Unicode code
// points), in all seven languages, and a few listing rules (no emoji, no
// «free»/ranking claims in the title or short description).
// Usage (from mano/): node scripts/check-play-listing.mjs
import fs from 'node:fs';

const file = new URL('../../docs/playstore/listing.md', import.meta.url);
const text = fs.readFileSync(file, 'utf8');
const LANGS = ['es', 'en', 'fr', 'de', 'it', 'ar', 'ja'];
const LIMITS = { title: 30, short: 80, full: 4000 };
const BANNED = /\b(gratis|free|gratuit|kostenlos|gratuito|#1|n\.?º ?1|best|mejor|meilleur|beste|migliore)\b|مجاني|無料/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const length = value => [...value].length;
let failures = 0;
const fail = message => { failures++; console.log(`✗ ${message}`); };

for (const lang of LANGS) {
  const section = new RegExp(`^### ${lang}\\n([\\s\\S]*?)(?=^### |(?![\\s\\S]))`, 'm').exec(text)?.[1];
  if (!section) { fail(`${lang}: section missing`); continue; }
  const title = /^- title: (.+)$/m.exec(section)?.[1]?.trim() ?? '';
  const short = /^- short: (.+)$/m.exec(section)?.[1]?.trim() ?? '';
  const full = /```text\n([\s\S]*?)\n```/.exec(section)?.[1] ?? '';
  const fields = { title, short, full };
  for (const [name, value] of Object.entries(fields)) {
    if (!value) { fail(`${lang} ${name}: empty`); continue; }
    if (length(value) > LIMITS[name]) fail(`${lang} ${name}: ${length(value)} > ${LIMITS[name]}`);
    if (EMOJI.test(value)) fail(`${lang} ${name}: emoji`);
  }
  for (const [name, value] of Object.entries({ title, short })) if (BANNED.test(value)) fail(`${lang} ${name}: promotional word («${BANNED.exec(value)[0]}»)`);
  if (/iPhone|iCloud|App Store/.test(section)) fail(`${lang}: names iPhone things`);
  console.log(`${failures ? '·' : '✓'} ${lang}: title ${length(title)}/30 · short ${length(short)}/80 · full ${length(full)}/4000`);
}
console.log(failures ? `PLAY_LISTING_FAILED ${failures}` : 'PLAY_LISTING_OK');
process.exit(failures ? 1 : 0);
