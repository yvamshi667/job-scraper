import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";
const WEBHOOK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/ingest-jobs` : null;

function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function getCompanies() {
  if (!hasSupabaseConfig()) {
    console.warn(
      "⚠️  Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list.\n" +
      "Set SUPABASE_URL and SUPABASE_ANON_KEY to enable fetching companies from Supabase."
    );
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("❌ Invalid companies response:", data);
    return [];
  }

  return data;
}

export async function sendJobs(jobs) {
  if (!jobs?.length) return;

  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️  Not sending jobs: SUPABASE_URL/ SCRAPER_SECRET_KEY missing. Set these to enable sending job payloads to Supabase functions."
    );
    return;
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ jobs })
  });
}
