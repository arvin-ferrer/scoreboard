// Command line options shared by `npm start` and the start script.
//  --backup-dir <folder>   where the minute backups go (overrides BACKUP_DIR and settings.json)
//  --from-backup <path>    start from a backup folder or .sqlite file
//  --force                 allow --from-backup to replace scores already on this laptop
export function parseArgs(argv) {
  const out = { backupDir: null, fromBackup: null, force: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    const value = () => {
      const v = inline ?? argv[++i];
      if (!v) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === '--backup-dir') out.backupDir = value();
    else if (flag === '--from-backup') out.fromBackup = value();
    else if (flag === '--force') out.force = true;
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return out;
}
