import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const INGEST_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

/* ------------------ COMPANIES ------------------ */

export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️ Supabase env vars missing. Returning empty companies.");
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
    console.error("❌ Failed fetching companies", await res.text());
    return [];
  }

  return await res.json();
}

/* ------------------ SEND JOBS ------------------ */

export async function sendJobs(jobs) {
  if (!INGEST_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ Missing ingest config. Skipping send.");
    return;
  }

  console.log(`🚚 Sending ${jobs.length} jobs in batches of 200`);

  const BATCH_SIZE = 200;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify(batch),
      });

      if (!res.ok) {
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed`, await res.text());
        return;
      }

      console.log(`✅ Batch ${i / BATCH_SIZE + 1} sent`);
    } catch (err) {
      console.error("🔥 Send failed:", err.message);
      return;
    }
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
