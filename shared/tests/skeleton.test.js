import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const rows = (p) => read(p).trim().split('\n').slice(1).map((l) => l.split(','));

describe('skeleton data', () => {
  it('scoring.json parses and has both tentative switches', () => {
    const s = JSON.parse(read('shared/scoring.json'));
    expect(s.andante.defenderAtTrebleCap.tentative).toBe(true);
    expect(s.andante.poolAnswerAtTrebleCap.tentative).toBe(true);
    expect(s.general.requireHostConfirmationBetweenSteps).toBe(true);
  });
  it('chambers.csv has 8 chambers', () => {
    expect(rows('data/chambers.csv')).toHaveLength(8);
  });
  it('questions.csv has 60 questions with the right difficulty split and unique codes', () => {
    const q = rows('data/questions.csv');
    expect(q).toHaveLength(60);
    expect(new Set(q.map((r) => r[0])).size).toBe(60);
    const count = (d) => q.filter((r) => r[3] === d).length;
    expect([count('easy'), count('medium'), count('hard')]).toEqual([25, 20, 15]);
    expect(q.every((r) => /^A[12]-[EMH]-\d{2}$/.test(r[0]))).toBe(true);
  });
});
