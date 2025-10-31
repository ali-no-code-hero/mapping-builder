import { CityParseResult } from './types';

// Utility functions
export function normState(abbrev: string | null | undefined): string {
  return String(abbrev || '').replace(/[^A-Za-z]/g, '').toUpperCase();
}

export function splitPhrases(s: string | null | undefined): string[] {
  if (!s) return [];
  return String(s)
    .split(/[|,;/]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

export function toNum(x: any): number | null {
  const n = x === null || x === undefined || x === '' ? NaN : Number(x);
  return Number.isFinite(n) ? n : null;
}

export function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Non-greedy parser; accepts "<City> ST" or "<City> ST US"
export function parseCitiesForState(
  locationStr: string | null | undefined,
  stateAbbrev: string
): CityParseResult[] {
  if (!locationStr) return [];
  const target = normState(stateAbbrev);
  return locationStr
    .split(/\s*,\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(chunk => {
      const m = chunk.match(/^(.*?)\s+([A-Za-z]{2})(?:\s+US)?$/i);
      if (!m) return null;
      return {
        city: m[1].trim(),
        state: normState(m[2]),
        raw: `${m[1].trim()} ${normState(m[2])} US`,
      };
    })
    .filter((x): x is CityParseResult => x !== null)
    .filter(o => o.state === target);
}

// Concurrency pool helper
export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results = new Array(items.length);
  let idx = 0;

  async function next(): Promise<void> {
    const i = idx++;
    if (i >= items.length) return;
    results[i] = await worker(items[i], i);
    return next();
  }

  const starters = Array.from({ length: Math.min(limit, items.length) }, () =>
    next()
  );
  await Promise.all(starters);
  return results;
}



