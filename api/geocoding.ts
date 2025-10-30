import { Client } from '@googlemaps/google-maps-services-js';
import { GeocodeStats, CityParseResult } from './types';

export class GeocodingService {
  private cache: Map<string, { lat: number; lng: number } | null>;
  private stats: GeocodeStats;
  private client?: Client;
  private apiKey?: string;
  private rapidApiKey?: string;
  private useRapidApi: boolean;

  constructor(
    apiKey?: string,
    rapidApiKey?: string,
    debugMode: boolean = false
  ) {
    this.cache = new Map();
    this.stats = {
      cache_hits: 0,
      cache_misses: 0,
      http_ok: 0,
      http_fail: 0,
      parsed_ok: 0,
      parsed_fail: 0,
      calls_made: 0,
    };

    // Prefer RapidAPI if key is provided (for compatibility with original script)
    // Otherwise use Google Maps API directly
    this.useRapidApi = !!rapidApiKey;
    if (rapidApiKey) {
      this.rapidApiKey = rapidApiKey;
    } else if (apiKey) {
      this.client = new Client({});
      this.apiKey = apiKey;
    }
  }

  getStats(): GeocodeStats {
    return { ...this.stats };
  }

  async geocodeCityState(
    city: string,
    state: string
  ): Promise<{ lat: number; lng: number } | null> {
    const key = `${city}, ${state}`;

    // Check cache
    if (this.cache.has(key)) {
      this.stats.cache_hits++;
      return this.cache.get(key) || null;
    }

    this.stats.cache_misses++;
    this.stats.calls_made++;

    try {
      let result: { lat: number; lng: number } | null = null;

      if (this.useRapidApi && this.rapidApiKey) {
        result = await this.geocodeViaRapidApi(city, state);
      } else if (this.client && this.apiKey) {
        result = await this.geocodeViaGoogleApi(city, state);
      } else {
        // No API key provided
        this.stats.http_fail++;
        this.cache.set(key, null);
        return null;
      }

      if (result) {
        this.stats.parsed_ok++;
      } else {
        this.stats.parsed_fail++;
      }

      this.cache.set(key, result);
      return result;
    } catch (error) {
      this.stats.http_fail++;
      this.cache.set(key, null);
      return null;
    }
  }

  private async geocodeViaRapidApi(
    city: string,
    state: string
  ): Promise<{ lat: number; lng: number } | null> {
    const RAPIDAPI_HOST = 'google-maps-geocoding3.p.rapidapi.com';
    const url = `https://${RAPIDAPI_HOST}/geocode?address=${encodeURIComponent(
      `${city}, ${state}`
    )}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': this.rapidApiKey!,
        },
      });

      if (!response.ok) {
        this.stats.http_fail++;
        return null;
      }

      this.stats.http_ok++;
      const data: any = await response.json();

      // Parse response (same logic as original script)
      let lat: number | null = null;
      let lng: number | null = null;

      if (data && data.latitude !== undefined && data.longitude !== undefined) {
        lat = Number(data.latitude);
        lng = Number(data.longitude);
      } else if (
        data &&
        Array.isArray(data.results) &&
        data.results[0]?.geometry?.location
      ) {
        lat = Number(data.results[0].geometry.location.lat);
        lng = Number(data.results[0].geometry.location.lng);
      } else if (data?.geometry?.location) {
        lat = Number(data.geometry.location.lat);
        lng = Number(data.geometry.location.lng);
      }

      if (
        typeof lat === 'number' && Number.isFinite(lat) &&
        typeof lng === 'number' && Number.isFinite(lng)
      ) {
        return { lat, lng };
      }

      return null;
    } catch (error) {
      this.stats.http_fail++;
      return null;
    }
  }

  private async geocodeViaGoogleApi(
    city: string,
    state: string
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await this.client!.geocode({
        params: {
          address: `${city}, ${state}`,
          key: this.apiKey!,
        },
      });

      if (response.data.status === 'OK' && response.data.results?.[0]) {
        this.stats.http_ok++;
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
        };
      } else {
        this.stats.http_fail++;
        return null;
      }
    } catch (error) {
      this.stats.http_fail++;
      return null;
    }
  }

  // Batch geocode with parallel processing
  async geocodeBatch(
    cities: CityParseResult[],
    batchSize: number
  ): Promise<({ lat: number; lng: number } | null)[]> {
    const results: ({ lat: number; lng: number } | null)[] = [];

    for (let i = 0; i < cities.length; i += batchSize) {
      const batch = cities.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(c => this.geocodeCityState(c.city, c.state))
      );
      results.push(...batchResults);
    }

    return results;
  }
}


