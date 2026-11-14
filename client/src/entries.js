// Pure helpers. Everything the screen shows is derived from the host's entries plus the unsent outbox.

// Host entries plus unsent items (marked pending). Items the host already has are skipped.
export function effectiveEntries(entries, outbox) {
  const seen = new Set(entries.map((e) => e.id));
  const pending = outbox
    .filter((o) => !seen.has(o.msg.id))
    .map((o) => (o.kind === 'add'
      ? { ...o.msg, voids: null, pending: true }
      : { id: o.msg.id, voids: o.msg.voids, points: 0, pending: true }));
  return [...entries, ...pending];
}

// Entries that count: not a void, and not cancelled by a void.
export function liveEntries(all) {
  const voided = new Set(all.filter((e) => e.voids).map((e) => e.voids));
  return all.filter((e) => !e.voids && !voided.has(e.id));
}

export function totalsOf(chamberIds, live) {
  const t = Object.fromEntries(chamberIds.map((c) => [c, 0]));
  for (const e of live) if (e.chamber in t) t[e.chamber] += e.points;
  return t;
}

// Newest first.
export function recentFor(live, chamber, n) {
  if (n <= 0) return [];
  return live.filter((e) => e.chamber === chamber).slice(-n).reverse();
}

export function countFor(live, chamber, round, label) {
  return live.filter((e) => e.chamber === chamber && e.round === round && e.label === label).length;
}
