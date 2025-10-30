import { CityParseResult, PickCityResult } from './types';
import { GeocodingService } from './geocoding';
import { haversineKm, toNum } from './utils';

export class CityPicker {
  constructor(
    private geocodingService: GeocodingService,
    private cityBatchSize: number,
    private earlyExitKm: number
  ) {}

  async pickCityFast(
    citiesInState: CityParseResult[],
    subLat: number | null,
    subLng: number | null,
    subCity: string
  ): Promise<PickCityResult> {
    // 0) Exact city short-circuit (no API)
    const subCityLower = String(subCity || '').toLowerCase().trim();
    if (subCityLower) {
      const exact = citiesInState.find(
        c => c.city.toLowerCase().trim() === subCityLower
      );
      if (exact) {
        return { chosen: exact, distance_km: 0, early: 'exact_match' };
      }
    }

    // 1) If no subscriber coords, deterministic fallback
    const haveGeo =
      subLat !== null &&
      subLng !== null &&
      Number.isFinite(subLat) &&
      Number.isFinite(subLng);
    if (!haveGeo) {
      const chosen = [...citiesInState].sort((a, b) =>
        a.city.localeCompare(b.city, 'en', { sensitivity: 'base' })
      )[0];
      return { chosen, distance_km: null, early: 'no_geo' };
    }

    // 2) Geocode in small batches; stop once best ≤ EARLY_EXIT_KM
    let best = { idx: -1, dist: Infinity };
    let i = 0;

    while (i < citiesInState.length) {
      const batch = citiesInState.slice(i, i + this.cityBatchSize);

      // Geocode batch concurrently
      const coords = await Promise.all(
        batch.map(c => this.geocodingService.geocodeCityState(c.city, c.state))
      );

      // Measure distances for geocoded ones
      for (let j = 0; j < batch.length; j++) {
        const gc = coords[j];
        if (!gc) continue;
        const d = haversineKm(subLat!, subLng!, gc.lat, gc.lng);
        if (d < best.dist) {
          best = { idx: i + j, dist: d };
        }
      }

      // Early exit if good enough
      if (best.idx !== -1 && best.dist <= this.earlyExitKm) {
        const chosen = citiesInState[best.idx];
        return {
          chosen,
          distance_km: Number(best.dist.toFixed(3)),
          early: 'threshold',
        };
      }

      i += this.cityBatchSize;
    }

    // 3) No one ≤ threshold: if we have a best, use it. Otherwise deterministic fallback.
    if (best.idx !== -1) {
      const chosen = citiesInState[best.idx];
      return {
        chosen,
        distance_km: Number(best.dist.toFixed(3)),
        early: 'best_after_all',
      };
    }

    const chosen = [...citiesInState].sort((a, b) =>
      a.city.localeCompare(b.city, 'en', { sensitivity: 'base' })
    )[0];
    return { chosen, distance_km: null, early: 'no_geocode_success' };
  }
}


