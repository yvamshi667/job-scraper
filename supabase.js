// supabase.js
import fetch from "node-fetch";

function assertEnv(...keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`❌ Missing required env vars: ${missing.join(", ")}`);
  }
}

const BASE = process.env.SUPABASE_FUNCTIONS_BASE_URL;
const KEY  = process.env.SCRAPER_SECRET_KEY;

export async function ingestCompanies(companies) {
  assertEnv("SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY");

  const res = await fetch(`${BASE}/ingest-companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": KEY
    },
    body: JSON.stringify({ companies })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ingest-companies failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function getCompanies() {
  assertEnv("SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY");

  const res = await fetch(`${BASE}/get-companies`, {
    headers: { "x-scraper-key": KEY }
  });

  if (!res.ok) {
    throw new Error(`get-companies failed: ${res.status}`);
  }

  return res.json();
}

export async function sendJobs(jobs) {
  assertEnv("SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY");

  const res = await fetch(`${BASE}/ingest-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": KEY
    },
    body: JSON.stringify({ jobs })
  });

  if (!res.ok) {
    throw new Error(`ingest-jobs failed: ${res.status}`);
  }

  return res.json();
}
