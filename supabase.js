// supabase.js
const REQUIRED_ENV_VARS = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED_ENV_VARS.filter(
    (v) => !process.env[v]
  );

  if (missing.length) {
    throw new Error(
      `❌ Missing env vars: ${missing.join(", ")}`
    );
  }
}

/**
 * Send jobs to Supabase Edge Function
 */
export async function ingestJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log("ℹ️ No jobs to ingest");
    return;
  }

  assertEnv();

  console.log(`📥 Ingesting ${jobs.length} jobs...`);

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      },
      body: JSON.stringify({ jobs })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `❌ ingest-jobs failed ${res.status}: ${text}`
    );
  }

  console.log("✅ Jobs ingested successfully");
}
