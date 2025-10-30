import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ServiceInput, ServiceOutput } from './types';
import { GeocodingService } from './geocoding';
import { CityPicker } from './city-picker';
import { JobProcessor } from './job-processor';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const input: ServiceInput = req.body;

    // Validate required fields
    if (!input.nursing_form_jobs || !input.nursing_form_jobs.response_jobs) {
      res.status(400).json({
        error: 'Missing required field: nursing_form_jobs.response_jobs',
      });
      return;
    }

    // Extract configuration
    const jobConcurrency = Number(input.job_concurrency || 6);
    const cityBatchSize = Number(input.city_batch_size || 6);
    const earlyExitKm = Number(input.early_exit_km || 100);
    const debug = Boolean(input.debug);

    // Get API keys from environment or input
    const rapidApiKey =
      process.env.RAPIDAPI_KEY ||
      input.rapidapi_key ||
      'd31f292b79msh9db608be9af91b6p1dc814jsn550d05da759c'; // fallback
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || input.google_maps_api_key;

    // Initialize services
    const geocodingService = new GeocodingService(
      googleApiKey,
      rapidApiKey,
      debug
    );
    const cityPicker = new CityPicker(
      geocodingService,
      cityBatchSize,
      earlyExitKm
    );
    const jobProcessor = new JobProcessor(geocodingService, cityPicker, {
      jobConcurrency,
      cityBatchSize,
      earlyExitKm,
      debug,
    });

    // Process jobs
    const output: ServiceOutput = await jobProcessor.processJobs(input);

    // Return result
    res.status(200).json(output);
  } catch (error) {
    console.error('Error processing jobs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      result: [],
      __debug: {
        stage: 'error',
        errors: [{ where: 'handler', message: String(error) }],
      },
    });
  }
}

