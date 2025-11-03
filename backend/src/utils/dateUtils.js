export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

export function daysBetween(a, b) {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function yearsBetween(from, to = new Date()) {
  const d1 = new Date(from);
  const d2 = new Date(to);
  let age = d2.getFullYear() - d1.getFullYear();
  const m = d2.getMonth() - d1.getMonth();
  if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) age--;
  return age;
}

export function isPast(date) {
  return new Date(date).getTime() <= Date.now();
}
