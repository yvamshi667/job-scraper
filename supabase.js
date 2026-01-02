// supabase.js
const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const COMPANIES_URL = INGEST_URL.replace("/ingest-jobs", "/get-companies");
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

export async function getCompanies() {
  const res = await fetch(COMPANIES_URL, {
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }

  const { companies } = await res.json();
  return companies;
}

export async function sendJobs(jobs) {
  if (!jobs.length) return;

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job ingest failed: ${text}`);
  }
}
