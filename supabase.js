// supabase.js
const requireEnv = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const BASE_URL = requireEnv("SUPABASE_FUNCTIONS_BASE_URL");
const SCRAPER_KEY = requireEnv("SCRAPER_SECRET_KEY");

const headers = {
  "Content-Type": "application/json",
  "x-scraper-key": SCRAPER_KEY,
};

export async function getCompanies() {
  const res = await fetch(`${BASE_URL}/get-companies`, { headers });
  if (!res.ok) throw new Error(`get-companies failed ${res.status}`);
  return res.json();
}

export async function ingestCompanies(companies) {
  const res = await fetch(`${BASE_URL}/ingest-companies`, {
    method: "POST",
    headers,
    body: JSON.stringify({ companies }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-companies failed ${res.status}: ${text}`);
  }

  return res.json();
}

export async function ingestJobs(jobs) {
  const res = await fetch(`${BASE_URL}/ingest-jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
  }

  return res.json();
}
