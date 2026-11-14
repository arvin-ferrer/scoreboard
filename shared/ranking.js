// Pure ranking helper, shared by server, client and tests.
// totals: { chamberId: number }. tieOrder: chamber ids in the order a proctor picked tie winners.
// Returns { order, ties }.
//  order: chamber ids best first. Chambers still tied stay in id order.
//  ties:  podium ties still open: [{ place, total, chambers }]. "place" is the place being decided now.
export function rank(chamberIds, totals, tieOrder = []) {
  const total = (id) => totals[id] ?? 0;
  const sorted = [...chamberIds].sort((a, b) => total(b) - total(a) || (a < b ? -1 : 1));
  const order = [];
  const ties = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j < sorted.length && total(sorted[j]) === total(sorted[i])) j++;
    const group = sorted.slice(i, j);
    const picked = tieOrder.filter((id) => group.includes(id));
    const open = group.filter((id) => !picked.includes(id));
    order.push(...picked, ...open);
    const place = i + picked.length + 1;
    if (open.length > 1 && place <= 3) ties.push({ place, total: total(open[0]), chambers: open });
    i = j;
  }
  return { order, ties };
}
