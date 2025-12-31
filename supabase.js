import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️ Supabase env vars missing. Returning empty companies list.");
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.error("❌ Failed to fetch companies:", await res.text());
    return [];
  }

  return res.json();
}

export async function sendJobs(jobs) {
  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ Missing webhook URL or scraper secret. Skipping send.");
    return;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",

      // ✅ THIS IS THE FIX
      "x-scraper-key": SCRAPER_SECRET_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    console.error("❌ Failed to send jobs:", await res.text());
  } else {
    console.log("✅ Jobs sent successfully");
  }
}
