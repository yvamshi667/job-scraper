const COMPANIES_URL = process.env.SUPABASE_COMPANIES_URL;
const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

function assertEnv() {
  const missing = [];
  if (!COMPANIES_URL) missing.push("SUPABASE_COMPANIES_URL");
  if (!INGEST_URL) missing.push("SUPABASE_INGEST_URL");
  if (!SCRAPER_KEY) missing.push("SCRAPER_SECRET_KEY");

  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

export async function getCompanies() {
  assertEnv();

  const res = await fetch(COMPANIES_URL, {
    headers: { "x-scraper-key": SCRAPER_KEY }
  });

  if (!res.ok) {
    throw new Error(`getCompanies failed ${res.status}`);
  }

  const json = await res.json();
  return json.companies || [];
}

export async function sendJobs(jobs) {
  assertEnv();
  if (!jobs.length) return;

  const BATCH = 200;

  for (let i = 0; i < jobs.length; i += BATCH) {
    const chunk = jobs.slice(i, i + BATCH);

    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": SCRAPER_KEY
      },
      body: JSON.stringify({ jobs: chunk })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`ingest-jobs failed ${res.status}: ${txt}`);
    }

    console.log(`✅ Batch ${i / BATCH + 1} sent (${chunk.length})`);
  }
}
