import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️ Supabase env vars missing. Returning empty companies list.");
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    { headers: HEADERS }
  );

  if (!res.ok) {
    console.error("❌ Failed to fetch companies", await res.text());
    return [];
  }

  return await res.json();
}

export async function insertJob(job) {
  if (!SUPABASE_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ Missing webhook or secret. Skipping insert.");
    return false;
  }

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/ingest-jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-secret": SCRAPER_SECRET_KEY,
      },
      body: JSON.stringify({ jobs: [job] }),
    }
  );

  if (!res.ok) {
    console.error("❌ Job insert failed", await res.text());
    return false;
  }

  return true;
}
