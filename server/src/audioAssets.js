import fs from 'node:fs';
import path from 'node:path';
import { AUDIO_EXTS, MAX_AUDIO_BYTES, SFX_CUE_IDS, audioExt } from '../../shared/sfx.js';

export const SFX_ASSET_DIR = 'client/assets/sfx';

/** Remove existing audio files matching `<prefix>.<ext>` in `dir`, optionally keeping `keepName`. */
export function clearAudioPrefix(dir, prefix, keepName = null) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (name === keepName) continue;
    const ext = path.extname(name).toLowerCase();
    if (name.slice(0, name.length - ext.length) === prefix && AUDIO_EXTS.includes(ext)) {
      fs.unlinkSync(path.join(dir, name));
      removed += 1;
    }
  }
  return removed;
}

/** Validate and atomically save an uploaded audio buffer as `<dir>/<prefix><ext>`. */
export function saveUploadedAudio({ dir, prefix, filename, data, maxBytes = MAX_AUDIO_BYTES }) {
  const ext = audioExt(filename);
  if (!ext) return { ok: false, error: 'Unsupported audio format' };
  const buf = Buffer.isBuffer(data) ? data : (data instanceof Uint8Array ? Buffer.from(data) : null);
  if (!buf || buf.length === 0) return { ok: false, error: 'Empty audio file' };
  if (buf.length > maxBytes) return { ok: false, error: 'File exceeds size limit' };

  fs.mkdirSync(dir, { recursive: true });
  const targetName = `${prefix}${ext}`;
  const target = path.join(dir, targetName);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, buf);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, target);
  clearAudioPrefix(dir, prefix, targetName);
  return { ok: true, filename: targetName, path: target };
}

/** Return `{ [cueId]: { url, version } | null }` for every SFX cue in `SFX_CUE_IDS`. */
export function listSfx(root) {
  const dir = path.join(root, SFX_ASSET_DIR);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const out = {};
  for (const cue of SFX_CUE_IDS) {
    const match = files.find((f) => {
      const ext = path.extname(f).toLowerCase();
      return f.slice(0, f.length - ext.length) === cue && AUDIO_EXTS.includes(ext);
    });
    if (!match) { out[cue] = null; continue; }
    const stat = fs.statSync(path.join(dir, match));
    out[cue] = { url: `/sfx-assets/${match}`, version: Math.trunc(stat.mtimeMs) };
  }
  return out;
}
