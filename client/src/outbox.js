// Unsent entries, kept in order and saved in the browser so a page refresh does not lose them.
// An item is { kind: 'add' | 'void', msg }. It leaves the outbox only when the host answers.
const KEY = 'gof-outbox';
const DEVICE_KEY = 'gof-device';

export function loadOutbox(storage) {
  try {
    const list = JSON.parse(storage.getItem(KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((o) => o && (o.kind === 'add' || o.kind === 'void') && o.msg?.id) : [];
  } catch { return []; }
}

export function saveOutbox(storage, outbox) {
  try { storage.setItem(KEY, JSON.stringify(outbox)); } catch { /* storage blocked: keep going in memory */ }
}

// Browsers only offer crypto.randomUUID on https or localhost; scorers open the host over plain http on the LAN.
export const newId = (c = globalThis.crypto) =>
  c.randomUUID?.() ?? Array.from(c.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

export const enqueue =(outbox, item) => (outbox.some((o) => o.msg.id === item.msg.id) ? outbox : [...outbox, item]);
export const dequeue = (outbox, id) => outbox.filter((o) => o.msg.id !== id);

// A host answer of added, duplicate or rejected all mean "done with this item".
export const isFinalAnswer = (res) => ['added', 'duplicate', 'rejected'].includes(res?.status);

export function deviceId(storage, makeId = () => Math.random().toString(36).slice(2, 6)) {
  try {
    let id = storage.getItem(DEVICE_KEY);
    if (!id) { id = `dev-${makeId()}`; storage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return `dev-${makeId()}`; }
}
