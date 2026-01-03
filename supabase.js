// supabase.js (root)
const REQUIRED = ["SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY"];

export function assertEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

export function functionsBaseUrl() {
  assertEnv();
  return process.env.SUPABASE_FUNCTIONS_BASE_URL.replace(/\/$/, "");
}

function authHeaders() {
  assertEnv();
  return {
    "content-type": "application/json",
    "x-scraper-key": process.env.SCRAPER_SECRET_KEY
  };
}

export async function getCompanies({ country = "US", limit = 200 } = {}) {
  const base = functionsBaseUrl();
  const url = new URL(`${base}/get-companies`);
  url.searchParams.set("country", country);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders()
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`get-companies failed ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function sendJobs(jobs) {
  const base = functionsBaseUrl();
  const res = await fetch(`${base}/ingest-jobs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ jobs })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ingest-jobs failed ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function ingestCompanies(companies) {
  const base = functionsBaseUrl();
  const res = await fetch(`${base}/ingest-companies`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ companies })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ingest-companies failed ${res.status}: ${txt}`);
  }
  return res.json();
}
