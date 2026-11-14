import fs from 'node:fs';

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
