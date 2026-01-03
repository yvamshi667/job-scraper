// supabase.js
const REQUIRED_ENV = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY",
];

function assertEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

/**
 * Send jobs to ingest-jobs edge function in batches
 */
export async function sendJobs(jobs, batchSize = 200) {
  assertEnv();

  const endpoint = `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`;

  let sent = 0;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs: batch }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
    }

    sent += batch.length;
    console.log(`✅ Batch sent (${sent}/${jobs.length})`);
  }
}
