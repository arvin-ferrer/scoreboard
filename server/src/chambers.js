import fs from 'node:fs';
import path from 'node:path';

function splitCsvLine(line) {
  const out = [];
  let cur = '', quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function loadChambers(file) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const cols = splitCsvLine(head);
  return lines.map((l) => Object.fromEntries(splitCsvLine(l).map((v, i) => [cols[i], v])));
}

// Adds logoUrl and songUrl to each chamber, or null when the file is not there yet.
// Files live in client/assets/chambers/<id>/ and are served at /chamber-assets, so they can be
// added without rebuilding the client.
export const CHAMBER_ASSET_DIR = 'client/assets/chambers';
export function withAssetUrls(root, chambers) {
  const base = path.join(root, CHAMBER_ASSET_DIR);
  const urlFor = (file) => {
    if (!file) return null;
    const rel = path.relative(base, path.join(root, file));
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return fs.existsSync(path.join(base, rel)) ? `/chamber-assets/${rel.split(path.sep).join('/')}` : null;
  };
  return chambers.map((c) => ({ ...c, logoUrl: urlFor(c.logo), songUrl: urlFor(c.song) }));
}
