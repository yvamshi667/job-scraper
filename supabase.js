// supabase.js

import fetch from "node-fetch";

const {
  SUPABASE_URL,
  SUPABASE_INGEST_URL,
  SCRAPER_SECRET_KEY
} = process.env;

if (!SUPABASE_URL || !SUPABASE_INGEST_URL || !SCRAPER_SECRET_KEY) {
  throw new Error("❌ Missing required env vars");
}

/**
 * Fetch companies from Lovable edge function
 */
export async function getCompanies() {
  const url = `${SUPABASE_URL}/functions/v1/get-companies`;

  const res = await fetch(url, {
    headers: {
      "x-scraper-key": SCRAPER_SECRET_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies (${res.status})`);
  }

  const { companies } = await res.json();
  return companies || [];
}

/**
 * Send scraped jobs to ingest-jobs edge function
 */
export async function sendJobs(jobs) {
  if (!jobs.length) return;

  const res = await fetch(SUPABASE_INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ jobs })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Job ingest failed: ${text}`);
  }
}
