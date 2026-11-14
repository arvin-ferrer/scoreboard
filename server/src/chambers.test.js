import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withAssetUrls } from './chambers.js';

describe('withAssetUrls', () => {
  it('links files that exist and gives null for the ones that do not', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-'));
    try {
      fs.mkdirSync(path.join(root, 'client/assets/chambers/c01'), { recursive: true });
      fs.writeFileSync(path.join(root, 'client/assets/chambers/c01/logo.png'), 'x');
      const list = withAssetUrls(root, [
        { id: 'c01', logo: 'client/assets/chambers/c01/logo.png', song: 'client/assets/chambers/c01/song.mp3' },
        { id: 'c02', logo: 'client/assets/chambers/c02/logo.png', song: '' },
        { id: 'c03', logo: '../../etc/passwd', song: 'client/assets/ui/logo/logo.svg' },
      ]);
      expect(list[0].logoUrl).toBe('/chamber-assets/c01/logo.png');
      expect(list[0].songUrl).toBe(null);
      expect(list[1]).toMatchObject({ logoUrl: null, songUrl: null });
      expect(list[2]).toMatchObject({ logoUrl: null, songUrl: null }); // outside the chambers folder
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
});
