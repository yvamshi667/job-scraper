const REQUIRED = [
  "SUPABASE_COMPANIES_URL",
  "SUPABASE_INGEST_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

export async function getCompanies() {
  assertEnv();

  const res = await fetch(process.env.SUPABASE_COMPANIES_URL, {
    headers: {
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }

  const json = await res.json();
  return json.companies || [];
}

export async function sendJobs(jobs) {
  assertEnv();

  const BATCH_SIZE = 200;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const res = await fetch(process.env.SUPABASE_INGEST_URL, {
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

    console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} sent (${batch.length})`);
  }
}
