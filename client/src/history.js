// History rows: every score entry, newest first, with a flag when it has been voided.
// Void rows themselves are not listed; they show up as the "voided" tag on the entry they cancel.
export function historyRows(entries, chamberFilter = 'all') {
  const voided = new Set(entries.filter((e) => e.voids).map((e) => e.voids));
  return entries
    .filter((e) => !e.voids && (chamberFilter === 'all' || e.chamber === chamberFilter))
    .map((e) => ({ ...e, voided: voided.has(e.id) }))
    .reverse();
}
