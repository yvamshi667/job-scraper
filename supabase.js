import fetch from "node-fetch";

/**
 * ENV VARS (required in GitHub Actions secrets)
 */
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

/**
 * Edge Function endpoint
 */
const INGEST_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

/**
 * Fetch active companies from Supabase
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
    );
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/companies?active=eq.true`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`❌ Failed to fetch companies: ${text}`);
  }

  const companies = await res.json();
  return companies || [];
}

/**
 * Send jobs to Supabase Edge Function
 * IMPORTANT: expects jobs to already be batched (e.g. 200 per call)
 */
export async function sendJobs(jobs) {
  if (!INGEST_ENDPOINT) {
    console.warn("⚠️ INGEST_ENDPOINT missing — skipping sendJobs()");
    return;
  }

  if (!SCRAPER_SECRET_KEY) {
    console.warn("⚠️ SCRAPER_SECRET_KEY missing — skipping sendJobs()");
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ sendJobs called with empty job array");
    return;
  }

  console.log(`📡 Sending ${jobs.length} jobs to ingest-jobs`);

  const res = await fetch(INGEST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_SECRET_KEY,
    },
    body: JSON.stringify(jobs),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`❌ Ingest failed: ${text}`);
  }

  console.log(`✅ Batch sent successfully (${jobs.length} jobs)`);
}
