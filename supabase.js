import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Fetch active companies from Supabase
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ SUPABASE env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
    );
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/companies?active=eq.true`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error("❌ Failed to fetch companies:", await res.text());
    return [];
  }

  return res.json();
}

/**
 * Send scraped jobs to Supabase Edge Function
 */
export async function sendJobs(jobs) {
  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ WEBHOOK_URL or SCRAPER_SECRET_KEY missing. Skipping job ingestion."
    );
    return;
  }

  if (!jobs.length) {
    console.log("ℹ️ No jobs to send.");
    return;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-secret": SCRAPER_SECRET_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    console.error("❌ Failed to send jobs:", await res.text());
  } else {
    console.log(`📤 Sent ${jobs.length} jobs to Supabase`);
  }
}
