// supabase.js
const REQUIRED_ENV = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

/**
 * Send jobs → ingest-jobs
 */
export async function sendJobs(jobs, batchSize = 200) {
  assertEnv();

  const endpoint = `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      },
      body: JSON.stringify({ jobs: batch })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
    }

    console.log(`✅ Sent ${batch.length} jobs`);
  }
}

/**
 * Send companies → ingest-companies
 */
export async function ingestCompanies(companies) {
  assertEnv();

  const endpoint = `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-companies`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ companies })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-companies failed ${res.status}: ${text}`);
  }

  console.log(`✅ Ingested ${companies.length} companies`);
}
