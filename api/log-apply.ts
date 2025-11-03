import type { VercelRequest, VercelResponse } from '@vercel/node';

interface LogApplyRequest {
  job_title: string;
  job_url: string;
  email: string;
  job_eid: string;
}

const COLLABWORK_API_URL = 'https://api.collabwork.com/api:ERDpOWih/log_apply';

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
    const body: LogApplyRequest = req.body;

    // Validate required fields
    if (!body.job_title || !body.job_url || !body.email || !body.job_eid) {
      res.status(400).json({
        error: 'Missing required fields. Need: job_title, job_url, email, job_eid',
      });
      return;
    }

    // Prepare payload for Collabwork API
    const payload = {
      job_title: body.job_title,
      job_url: body.job_url,
      email: body.email,
      job_eid: body.job_eid,
    };

    // Forward to Collabwork API
    const response = await fetch(COLLABWORK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Collabwork API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        payload,
      });
      res.status(response.status).json({
        error: 'Failed to log apply',
        details: errorText,
      });
      return;
    }

    const responseData = await response.json().catch(() => ({}));

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Apply logged successfully',
      data: responseData,
    });
  } catch (error) {
    console.error('Error logging apply:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}


