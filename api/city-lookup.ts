import * as fs from 'fs';
import * as path from 'path';
import kv from '@vercel/kv';

interface CityData {
  lat: number;
  lng: number;
}

// Lazy-loaded singleton for city lookup
class CityLookupService {
  private static instance: CityLookupService | null = null;
  private lookup: Map<string, CityData> = new Map();
  private loaded: boolean = false;

  private constructor() {}

  static getInstance(): CityLookupService {
    if (!CityLookupService.instance) {
      CityLookupService.instance = new CityLookupService();
    }
    return CityLookupService.instance;
  }

  private loadCSV(): void {
    if (this.loaded) return;

    try {
      // Try multiple possible paths
      const possiblePaths = [
        path.join(process.cwd(), 'data', 'uscities.csv'),
        path.join(__dirname, '..', 'data', 'uscities.csv'),
        path.join(process.cwd(), 'uscities.csv'),
      ];

      let csvPath: string | null = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          csvPath = p;
          break;
        }
      }

      if (!csvPath) {
        console.warn('City CSV file not found. Geocoding will use API only.');
        this.loaded = true;
        return;
      }

      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Parse CSV (handling quoted fields)
        const fields = this.parseCSVLine(line);
        if (fields.length < 8) continue;

        const cityAscii = fields[1]?.trim();
        const stateId = fields[2]?.trim();
        const latStr = fields[6]?.trim();
        const lngStr = fields[7]?.trim();

        if (!cityAscii || !stateId || !latStr || !lngStr) continue;

        const lat = Number(latStr);
        const lng = Number(lngStr);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        // Create lookup key: "city_ascii,state_id" (normalized to uppercase for case-insensitive)
        const key = `${cityAscii.toUpperCase()},${stateId.toUpperCase()}`;
        this.lookup.set(key, { lat, lng });

        // Also add with original city name (field 0) if different
        const cityName = fields[0]?.trim();
        if (cityName && cityName !== cityAscii) {
          const altKey = `${cityName.toUpperCase()},${stateId.toUpperCase()}`;
          if (!this.lookup.has(altKey)) {
            this.lookup.set(altKey, { lat, lng });
          }
        }
      }

      this.loaded = true;
      console.log(`City lookup loaded: ${this.lookup.size} cities indexed`);
    } catch (error) {
      console.error('Error loading city CSV:', error);
      this.loaded = true; // Mark as loaded to prevent retry loops
    }
  }

  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current); // Last field

    return fields.map(f => f.replace(/^"|"$/g, '')); // Remove surrounding quotes
  }

  async lookupCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.loaded) {
      this.loadCSV();
      await this.loadGeocodedCache();
    }

    // Normalize input
    const normalizedCity = city.toUpperCase().trim();
    const normalizedState = state.toUpperCase().trim();
    const key = `${normalizedCity},${normalizedState}`;

    // Check in-memory cache first
    const cached = this.lookup.get(key);
    if (cached) {
      return cached;
    }

    // If not in memory, check Redis KV (for newly added cities)
    // Only check if Redis KV is configured
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const redisData = await kv.hget<{ lat: number; lng: number }>('geocoded-cities', key);
        if (redisData && typeof redisData === 'object' && redisData.lat && redisData.lng) {
          // Add to in-memory cache for future lookups
          this.lookup.set(key, redisData);
          return redisData;
        }
      } catch (error) {
        // Silently fail - continue without Redis lookup
      }
    }

    return null;
  }

  /**
   * Add a newly geocoded city to the lookup cache.
   * Saves to Redis KV for persistence across deployments.
   */
  async addCity(city: string, state: string, lat: number, lng: number): Promise<void> {
    if (!this.loaded) {
      this.loadCSV();
      await this.loadGeocodedCache();
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    const normalizedCity = city.toUpperCase().trim();
    const normalizedState = state.toUpperCase().trim();
    const key = `${normalizedCity},${normalizedState}`;

    // Add to in-memory lookup
    this.lookup.set(key, { lat, lng });

    // Save to Redis KV for persistence
    await this.saveToRedisKV(city, state, lat, lng);
  }

  private async loadGeocodedCache(): Promise<void> {
    try {
      // Check if Redis KV is configured
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        // Redis KV not configured, skip silently
        return;
      }

      // Load all cities from Redis KV
      const cache = await kv.hgetall<Record<string, { lat: number; lng: number }>>('geocoded-cities');
      
      if (cache && typeof cache === 'object') {
        let addedCount = 0;
        for (const [key, data] of Object.entries(cache)) {
          if (!this.lookup.has(key) && data && typeof data === 'object' && data.lat && data.lng) {
            this.lookup.set(key, { lat: data.lat, lng: data.lng });
            addedCount++;
          }
        }
        
        if (addedCount > 0) {
          console.log(`Loaded ${addedCount} cities from Redis KV`);
        }
      }
    } catch (error) {
      // Only log if it's not a configuration error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Missing required environment variables')) {
        console.error('Error loading from Redis KV:', error);
      }
      // Continue without cache if there's an error
    }
  }

  private async saveToRedisKV(city: string, state: string, lat: number, lng: number): Promise<void> {
    try {
      // Check if Redis KV is configured
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        // Redis KV not configured, skip silently
        return;
      }

      const normalizedCity = city.toUpperCase().trim();
      const normalizedState = state.toUpperCase().trim();
      const key = `${normalizedCity},${normalizedState}`;
      
      // Save to Redis KV using hash
      await kv.hset('geocoded-cities', {
        [key]: { lat, lng }
      });
      
      console.log(`Saved ${key} to Redis KV`);
    } catch (error) {
      // Only log if it's not a configuration error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Missing required environment variables')) {
        console.error('Error saving to Redis KV:', error);
      }
      // Silently fail - the city is still cached in memory
    }
  }

  getStats(): { totalCities: number; loaded: boolean } {
    return {
      totalCities: this.lookup.size,
      loaded: this.loaded,
    };
  }
}

export const cityLookup = CityLookupService.getInstance();

