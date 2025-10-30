import Fuse from 'fuse.js';
import {
  Job,
  ServiceInput,
  DebugInfo,
  GeocodeStats,
} from './types';
import {
  normState,
  splitPhrases,
  toNum,
  parseCitiesForState,
  mapWithConcurrency,
} from './utils';
import { GeocodingService } from './geocoding';
import { CityPicker } from './city-picker';

export class JobProcessor {
  private geocodingService: GeocodingService;
  private cityPicker: CityPicker;
  private config: {
    jobConcurrency: number;
    cityBatchSize: number;
    earlyExitKm: number;
    debug: boolean;
  };

  constructor(
    geocodingService: GeocodingService,
    cityPicker: CityPicker,
    config: {
      jobConcurrency: number;
      cityBatchSize: number;
      earlyExitKm: number;
      debug: boolean;
    }
  ) {
    this.geocodingService = geocodingService;
    this.cityPicker = cityPicker;
    this.config = config;
  }

  async processJobs(input: ServiceInput): Promise<{
    result: Job[];
    __debug: DebugInfo;
  }> {
    const DEBUG_MAX_SAMPLES = this.config.debug ? 100 : 15;

    const NFJ = input.nursing_form_jobs || {};
    const jobs = Array.isArray(NFJ.response_jobs) ? NFJ.response_jobs : [];
    const subLat = toNum(NFJ.latitude ?? NFJ.city_latitude);
    const subLng = toNum(NFJ.longitude ?? NFJ.city_longitude);
    const subCity = NFJ.subscriber_city || '';
    const subState = normState(NFJ.subscriber_state || '');
    const PASSION_RAW = input.job_passion || '';
    const LICENSES_RAW = input.licenses || '';
    const BACKFILL = Boolean(input.backfill_when_less_than_3);

    const __debug: DebugInfo = {
      stage: 'init',
      inputs: {
        jobs_len: jobs.length,
        lat_parsed: subLat,
        lng_parsed: subLng,
        subscriber_city: subCity,
        subscriber_state_norm: subState,
        job_passion_raw: PASSION_RAW,
        licenses_raw: LICENSES_RAW,
        RAPIDAPI_KEY_present: !!(
          process.env.RAPIDAPI_KEY || input.rapidapi_key
        ),
        fuse_loaded: true,
        job_concurrency: this.config.jobConcurrency,
        city_batch_size: this.config.cityBatchSize,
        early_exit_km: this.config.earlyExitKm,
        backfill_when_less_than_3: BACKFILL,
        debug_on: this.config.debug,
      },
      steps: {
        prefilter: { dropped_no_state_city: 0, kept: 0, samples: [] },
        fuse: {
          threshold: 0.1,
          passionPhrases: splitPhrases(PASSION_RAW),
          licensePhrases: splitPhrases(LICENSES_RAW),
          matchedPassionIds_count: 0,
          matchedLicenseIds_count: 0,
        },
        selection: { reasons: [] },
        mode: '',
      },
      geocode_stats: {
        cache_hits: 0,
        cache_misses: 0,
        http_ok: 0,
        http_fail: 0,
        parsed_ok: 0,
        parsed_fail: 0,
        calls_made: 0,
      },
      errors: [],
      notes: [],
    };

    try {
      if (!Array.isArray(jobs) || jobs.length === 0) {
        __debug.notes.push('No jobs array or length == 0.');
        return { result: [], __debug };
      }

      if (!subState) {
        __debug.notes.push('Missing subscriber_state.');
        return { result: [], __debug };
      }

      const haveGeo =
        subLat !== null &&
        subLng !== null &&
        Number.isFinite(subLat) &&
        Number.isFinite(subLng);
      __debug.steps.mode = haveGeo ? 'distance' : 'no-geo-fallback';

      // Process jobs in parallel with JOB_CONCURRENCY
      const processed = await mapWithConcurrency(
        jobs,
        async (job: Job) => {
          const id = job.job_eid || job.id || job.url || '(unknown)';
          const citiesInState = parseCitiesForState(
            job.location || job.location_string || '',
            subState
          );

          if (!citiesInState.length) {
            __debug.steps.prefilter.dropped_no_state_city++;
            if (
              this.config.debug &&
              __debug.steps.selection.reasons.length < DEBUG_MAX_SAMPLES
            ) {
              __debug.steps.selection.reasons.push({
                id,
                title: job.title,
                reason: 'No city in subscriber state',
              });
            }
            return null;
          }

          const picked = await this.cityPicker.pickCityFast(
            citiesInState,
            subLat,
            subLng,
            subCity
          );
          const cityDisplay = `${picked.chosen.city} ${picked.chosen.state} US`;
          const distance =
            picked.distance_km == null ? null : Number(picked.distance_km);
          const updated: Job = {
            ...job,
            location: cityDisplay,
            location_string: cityDisplay,
            distance_km: distance,
          };

          if (
            this.config.debug &&
            __debug.steps.prefilter.samples.length < DEBUG_MAX_SAMPLES
          ) {
            __debug.steps.prefilter.samples.push({
              id,
              title: job.title,
              early_reason: picked.early,
              picked_city: cityDisplay,
              distance_km: distance,
            });
          }

          return updated;
        },
        Math.max(1, this.config.jobConcurrency)
      );

      const prefiltered = processed.filter((x): x is Job => x !== null);
      __debug.steps.prefilter.kept = prefiltered.length;

      if (!prefiltered.length) {
        __debug.notes.push(
          'All jobs filtered out before fuzzy matching.'
        );
        return { result: [], __debug };
      }

      // Sort by distance when we have it (nulls last)
      if (haveGeo) {
        prefiltered.sort((a, b) => {
          const da = Number.isFinite(a.distance_km) ? a.distance_km : Infinity;
          const db = Number.isFinite(b.distance_km) ? b.distance_km : Infinity;
          return da - db;
        });
      }

      // Update geocode stats from service
      const geoStats = this.geocodingService.getStats();
      __debug.geocode_stats = geoStats;

      // Fuzzy match (only if phrases exist)
      const passionPhrases = __debug.steps.fuse.passionPhrases;
      const licensePhrases = __debug.steps.fuse.licensePhrases;
      const requirePassion = passionPhrases.length > 0;
      const requireLicense = licensePhrases.length > 0;

      let matchSetPassion: Set<string> | null = null;
      let matchSetLicense: Set<string> | null = null;

      if (requirePassion || requireLicense) {
        const fuse = new Fuse(prefiltered, {
          includeScore: true,
          threshold: __debug.steps.fuse.threshold, // ≈90% strict
          keys: [
            { name: 'title', weight: 0.5 },
            { name: 'searchable_text', weight: 0.3 },
            { name: 'description', weight: 0.15 },
            { name: 'industry', weight: 0.05 },
          ],
        });

        const collect = (phrases: string[]): Set<string> => {
          const set = new Set<string>();
          for (const kw of phrases) {
            const res = fuse.search(kw);
            if (
              this.config.debug &&
              __debug.steps.selection.reasons.length < DEBUG_MAX_SAMPLES
            ) {
              __debug.steps.selection.reasons.push({
                id: `FUSE_QUERY:${kw}`,
                title: `hits:${res.length}`,
                reason: 'fuse_query',
              });
            }
            for (const r of res) {
              const jid =
                r?.item?.job_eid || r?.item?.id || r?.item?.url;
              if (jid) set.add(jid);
            }
          }
          return set;
        };

        if (requirePassion) {
          matchSetPassion = collect(passionPhrases);
        }
        if (requireLicense) {
          matchSetLicense = collect(licensePhrases);
        }

        __debug.steps.fuse.matchedPassionIds_count = matchSetPassion
          ? matchSetPassion.size
          : 0;
        __debug.steps.fuse.matchedLicenseIds_count = matchSetLicense
          ? matchSetLicense.size
          : 0;
      }

      // Pick closest 3 honoring fuzzy rules
      const picked: Job[] = [];
      for (const job of prefiltered) {
        const id: string = job.job_eid || job.id || job.url || '(unknown)';
        let ok = true;

        if (requirePassion && requireLicense) {
          ok = !!(
            matchSetPassion &&
            matchSetLicense &&
            matchSetPassion.has(id) &&
            matchSetLicense.has(id)
          );
        } else if (requirePassion) {
          ok = !!(matchSetPassion && matchSetPassion.has(id));
        } else if (requireLicense) {
          ok = !!(matchSetLicense && matchSetLicense.has(id));
        }

        if (ok) {
          picked.push(job);
          if (picked.length >= 3) break;
        } else if (
          this.config.debug &&
          __debug.steps.selection.reasons.length < DEBUG_MAX_SAMPLES
        ) {
          const reason =
            requirePassion && requireLicense
              ? `no BOTH match (passion:${matchSetPassion ? matchSetPassion.has(id) : false}, license:${matchSetLicense ? matchSetLicense.has(id) : false})`
              : requirePassion
              ? 'no passion match'
              : requireLicense
              ? 'no license match'
              : 'no keyword requirement';
          __debug.steps.selection.reasons.push({
            id,
            title: job.title,
            reason,
          });
        }
      }

      if (picked.length < 3 && BACKFILL) {
        __debug.notes.push(`Backfilling ${3 - picked.length}`);
        for (const job of prefiltered) {
          const id: string = job.job_eid || job.id || job.url || '(unknown)';
          if (!picked.find(j => ((j.job_eid || j.id || j.url || '(unknown)') === id))) {
            picked.push(job);
            if (picked.length >= 3) break;
          }
        }
      }

      __debug.stage = 'completed';
      return { result: picked.slice(0, 3), __debug };
    } catch (err) {
      __debug.stage = 'caught_exception';
      __debug.errors.push({
        where: 'main_catch',
        message: String((err as Error)?.message || err),
      });
      return { result: [], __debug };
    }
  }
}

