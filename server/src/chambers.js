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

// A name the CSV can hold: 1-60 characters, no quotes or line breaks (the reader has no escaping).
export const validName = (name) => typeof name === 'string' && /^[^"\r\n]{1,60}$/.test(name.trim());

// Writes the chamber list back in the same column order. Write-then-rename, so a crash mid-save
// leaves the old file whole instead of half a file.
export function saveChambers(file, chambers) {
  const cols = Object.keys(chambers[0]);
  const cell = (v) => (/[,]/.test(String(v ?? '')) ? `"${v}"` : String(v ?? ''));
  const text = [cols.join(','), ...chambers.map((c) => cols.map((k) => cell(c[k])).join(','))].join('\n') + '\n';
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
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
