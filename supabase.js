import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/ingest-jobs`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase env vars missing");
}

export async function getCompanies() {
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
  if (!jobs.length) return;

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ jobs })
  });
}
