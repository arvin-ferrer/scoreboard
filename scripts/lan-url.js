import os from 'node:os';

// Addresses other laptops can use to reach this one. The Windows hotspot network (192.168.137.x) comes first.
export function lanUrls(port, interfaces = os.networkInterfaces()) {
  const found = [];
  for (const [name, list] of Object.entries(interfaces)) {
    for (const a of list ?? []) {
      const v4 = a.family === 'IPv4' || a.family === 4;
      if (v4 && !a.internal && !a.address.startsWith('169.254.')) found.push({ name, address: a.address, url: `http://${a.address}:${port}` });
    }
  }
  const score = (a) => (a.address.startsWith('192.168.137.') ? 0 : a.address.startsWith('192.168.') ? 1 : 2);
  return found.sort((a, b) => score(a) - score(b) || a.address.localeCompare(b.address));
}
