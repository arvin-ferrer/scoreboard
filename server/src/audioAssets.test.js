import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SFX_ASSET_DIR, clearAudioPrefix, listSfx, saveUploadedAudio } from './audioAssets.js';

const dirs = [];
afterEach(() => { while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true }); });
const tmpDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-')); dirs.push(d); return d; };

describe('audioAssets', () => {
  it('saves valid audio files, replaces prior extensions cleanly, and rejects invalid uploads', () => {
    const dir = tmpDir();
    expect(saveUploadedAudio({ dir, prefix: 'song', filename: 'bad.exe', data: Buffer.from('x') }).ok).toBe(false);
    expect(saveUploadedAudio({ dir, prefix: 'song', filename: 'empty.mp3', data: Buffer.alloc(0) }).ok).toBe(false);
    expect(saveUploadedAudio({ dir, prefix: 'song', filename: 'big.mp3', data: Buffer.alloc(10), maxBytes: 5 }).ok).toBe(false);

    const first = saveUploadedAudio({ dir, prefix: 'song', filename: 'Track.MP3', data: Buffer.from('mp3-data') });
    expect(first).toMatchObject({ ok: true, filename: 'song.mp3' });
    expect(fs.readFileSync(path.join(dir, 'song.mp3'), 'utf8')).toBe('mp3-data');

    const second = saveUploadedAudio({ dir, prefix: 'song', filename: 'Track.wav', data: Buffer.from('wav-data') });
    expect(second).toMatchObject({ ok: true, filename: 'song.wav' });
    expect(fs.existsSync(path.join(dir, 'song.mp3'))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'song.wav'), 'utf8')).toBe('wav-data');

    expect(clearAudioPrefix(dir, 'song')).toBe(1);
    expect(fs.existsSync(path.join(dir, 'song.wav'))).toBe(false);
  });

  it('lists custom SFX files with version timestamps and null for missing cues', () => {
    const root = tmpDir();
    const sfxDir = path.join(root, SFX_ASSET_DIR);
    saveUploadedAudio({ dir: sfxDir, prefix: 'scoreUp', filename: 'ding.ogg', data: Buffer.from('ogg') });

    const listed = listSfx(root);
    expect(listed.scoreUp).toMatchObject({ url: '/sfx-assets/scoreUp.ogg' });
    expect(typeof listed.scoreUp.version).toBe('number');
    expect(listed.scoreDown).toBe(null);
  });
});
