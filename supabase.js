const REQUIRED = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED.filter(v => !process.env[v]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

export async function sendJobs(jobs) {
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
    throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
  }
}
