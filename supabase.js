const REQUIRED_ENVS = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED_ENVS.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

export async function sendJobs(jobs) {
  if (!jobs || jobs.length === 0) return;

  assertEnv();

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
    throw new Error(`Supabase ingest failed: ${text}`);
  }

  console.log(`✅ Sent ${jobs.length} jobs to Supabase`);
}
