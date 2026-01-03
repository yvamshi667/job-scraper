const BASE = process.env.SUPABASE_FUNCTIONS_BASE_URL;
const KEY = process.env.SCRAPER_SECRET_KEY;

if (!BASE || !KEY) {
  throw new Error("❌ Missing required env vars");
}

export async function getCompanies() {
  const res = await fetch(`${BASE}/get-companies`, {
    headers: { "x-scraper-key": KEY }
  });
  if (!res.ok) throw new Error("Failed to fetch companies");
  const data = await res.json();
  return data.companies || [];
}

export async function sendJobs(jobs) {
  if (!jobs.length) return;

  const BATCH = 200;

  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);

    const res = await fetch(`${BASE}/ingest-jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": KEY
      },
      body: JSON.stringify({ jobs: batch })
    });

    if (!res.ok) {
      console.warn(`⚠️ Batch failed: ${i}`);
    }
  }
}
