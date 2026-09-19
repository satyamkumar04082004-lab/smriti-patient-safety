/** Pure helpers for missed-medication logic (safe for client + tests). */

export interface MedicationLike {
  time: string; // "HH:MM" 24h
  takenAt?: number | null;
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** A dose is missed when its time has passed today and it is untaken. */
export function isMissed(med: MedicationLike): boolean {
  if (med.takenAt) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return minutesOfDay(med.time) <= nowMinutes;
}

/** "14:05" -> "2:05 PM" */
export function formatTime(hhmm: string): string {
  const minutes = minutesOfDay(hhmm);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
