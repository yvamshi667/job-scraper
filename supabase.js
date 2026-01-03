function assertEnv() {
  const missing = [];

  if (!process.env.SUPABASE_FUNCTIONS_BASE_URL)
    missing.push("SUPABASE_FUNCTIONS_BASE_URL");

  if (!process.env.SCRAPER_SECRET_KEY)
    missing.push("SCRAPER_SECRET_KEY");

  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

/* =========================
   DISCOVER → COMPANIES
========================= */
export async function ingestCompanies(companies) {
  assertEnv();

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-companies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ companies }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-companies failed ${res.status}: ${text}`);
  }
}

/* =========================
   SCRAPE → JOBS
========================= */
export async function sendJobs(jobs) {
  assertEnv();

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
  }
}
