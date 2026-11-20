import Database from 'better-sqlite3';

// Append-only score log. Rows are only ever inserted; triggers block UPDATE and DELETE.
// A void is a new row (points 0) whose `voids` points at the entry it cancels.
export function openScoreLog(dbPath = ':memory:', clock = Date.now) {
  const db = new Database(dbPath);
  db.pragma('synchronous = FULL'); // each entry is on disk before the host answers, so a power cut loses nothing acknowledged
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      chamber TEXT NOT NULL,
      points INTEGER NOT NULL,
      round TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      device TEXT NOT NULL DEFAULT '',
      host_time INTEGER NOT NULL,
      voids TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS entries_voids ON entries(voids) WHERE voids IS NOT NULL;
    CREATE TRIGGER IF NOT EXISTS entries_no_update BEFORE UPDATE ON entries
      BEGIN SELECT RAISE(ABORT, 'score log is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS entries_no_delete BEFORE DELETE ON entries
      BEGIN SELECT RAISE(ABORT, 'score log is append-only'); END;
    CREATE TABLE IF NOT EXISTS game_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);

  const insert = db.prepare(
    `INSERT OR IGNORE INTO entries (id, chamber, points, round, label, device, host_time, voids)
     VALUES (@id, @chamber, @points, @round, @label, @device, @host_time, @voids)`
  );
  const byId = db.prepare('SELECT * FROM entries WHERE id = ?');
  const isVoided = db.prepare('SELECT 1 FROM entries WHERE voids = ?');

  const str = (v) => (typeof v === 'string' ? v : '');

  return {
    // Returns { status: 'added' | 'duplicate', entry }.
    addEntry({ id, chamber, points, round, label, device }) {
      const row = { id, chamber, points, round, label: str(label), device: str(device), host_time: clock(), voids: null };
      if (insert.run(row).changes === 0) return { status: 'duplicate', entry: byId.get(id) };
      return { status: 'added', entry: byId.get(id) };
    },

    // Returns { status: 'added' | 'duplicate' | 'rejected', entry? }.
    // Rejected: target missing, target is itself a void, or target already voided.
    voidEntry({ id, voids, device }) {
      if (byId.get(id)) return { status: 'duplicate', entry: byId.get(id) };
      const target = byId.get(voids);
      if (!target || target.voids !== null || isVoided.get(voids)) return { status: 'rejected' };
      const row = {
        id, chamber: target.chamber, points: 0, round: target.round,
        label: `void of ${voids}`, device: str(device), host_time: clock(), voids,
      };
      insert.run(row);
      return { status: 'added', entry: byId.get(id) };
    },

    // Reset: one void for every entry still counting, in one transaction, so totals go to 0 and history keeps it all.
    voidAll({ device = '' } = {}) {
      const live = db.prepare(
        `SELECT * FROM entries WHERE voids IS NULL AND id NOT IN (SELECT voids FROM entries WHERE voids IS NOT NULL) ORDER BY seq`
      ).all();
      const now = clock();
      db.transaction(() => {
        for (const t of live) insert.run({ id: `reset-${now}-${t.seq}`, chamber: t.chamber, points: 0, round: t.round,
          label: 'reset', device: str(device), host_time: now, voids: t.id });
      })();
      return live.length;
    },

    // Rebuilt from the log every time: sum of entries that are not voided.
    totals(chamberIds = []) {
      const totals = Object.fromEntries(chamberIds.map((c) => [c, 0]));
      const rows = db
        .prepare(
          `SELECT chamber, SUM(points) AS total FROM entries
           WHERE voids IS NULL AND id NOT IN (SELECT voids FROM entries WHERE voids IS NOT NULL)
           GROUP BY chamber`
        )
        .all();
      for (const r of rows) totals[r.chamber] = r.total;
      return totals;
    },

    entriesSince(seq = 0) {
      return db.prepare('SELECT * FROM entries WHERE seq > ? ORDER BY seq').all(seq);
    },

    count() {
      return db.prepare('SELECT COUNT(*) AS n FROM entries').get().n;
    },

    // Small key/value store for round, timer and tie picks. Not part of the score log.
    getState(key) {
      const r = db.prepare('SELECT value FROM game_state WHERE key = ?').get(key);
      return r ? JSON.parse(r.value) : null;
    },
    setState(key, value) {
      db.prepare('INSERT INTO game_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run(key, JSON.stringify(value));
    },

    // Online copy of the whole database (entries and game state) to `file`. Safe while scoring continues.
    backupTo(file) {
      return db.backup(file);
    },

    close() {
      db.close();
    },
  };
}
