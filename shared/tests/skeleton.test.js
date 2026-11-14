import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

describe('skeleton data', () => {
  it('scoring.json has the rounds with integer quick-button values', () => {
    const { rounds } = JSON.parse(read('shared/scoring.json'));
    expect(Object.keys(rounds)).toEqual(['adagio', 'andante', 'allegro', 'vivace', 'awarding']);
    expect(rounds.adagio.groups[0].values).toEqual([10, 20, 30]);
    expect(rounds.vivace.tiebreak).toBe(true);
    for (const r of Object.values(rounds))
      for (const g of r.groups) expect(g.values.every(Number.isInteger)).toBe(true);
  });
  it('chambers.csv has 15 chambers', () => {
    expect(read('data/chambers.csv').trim().split('\n').slice(1)).toHaveLength(15);
  });
});
