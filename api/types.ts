// Type definitions for the service

export interface Job {
  job_eid?: string;
  id?: string;
  url?: string;
  title?: string;
  location?: string;
  location_string?: string;
  description?: string;
  searchable_text?: string;
  industry?: string;
  [key: string]: any; // Allow additional fields
}

export interface NursingFormJobs {
  response_jobs?: Job[];
  latitude?: number | string;
  longitude?: number | string;
  city_latitude?: number | string;
  city_longitude?: number | string;
  subscriber_city?: string;
  subscriber_state?: string;
}

export interface ServiceInput {
  nursing_form_jobs?: NursingFormJobs;
  job_passion?: string;
  licenses?: string;
  backfill_when_less_than_3?: boolean;
  job_concurrency?: number;
  city_batch_size?: number;
  early_exit_km?: number;
  debug?: boolean;
  rapidapi_key?: string;
  google_maps_api_key?: string;
}

export interface GeocodeStats {
  cache_hits: number;
  cache_misses: number;
  http_ok: number;
  http_fail: number;
  parsed_ok: number;
  parsed_fail: number;
  calls_made: number;
  csv_hits?: number; // Number of times CSV lookup was used (optional for backward compatibility)
}

export interface DebugInfo {
  stage: string;
  inputs: {
    jobs_len: number;
    lat_parsed: number | null;
    lng_parsed: number | null;
    subscriber_city: string;
    subscriber_state_norm: string;
    job_passion_raw: string;
    licenses_raw: string;
    RAPIDAPI_KEY_present: boolean;
    fuse_loaded: boolean;
    job_concurrency: number;
    city_batch_size: number;
    early_exit_km: number;
    backfill_when_less_than_3: boolean;
    debug_on: boolean;
  };
  steps: {
    prefilter: {
      dropped_no_state_city: number;
      kept: number;
      samples: any[];
    };
    fuse: {
      threshold: number;
      passionPhrases: string[];
      licensePhrases: string[];
      matchedPassionIds_count: number;
      matchedLicenseIds_count: number;
    };
    selection: {
      reasons: any[];
    };
    mode: string;
  };
  geocode_stats: GeocodeStats;
  errors: any[];
  notes: string[];
}

export interface ServiceOutput {
  result: Job[];
  __debug: DebugInfo;
}

export interface CityParseResult {
  city: string;
  state: string;
  raw: string;
}

export interface PickCityResult {
  chosen: CityParseResult;
  distance_km: number | null;
  early: string;
}

