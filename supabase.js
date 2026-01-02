// supabase.js
import fetch from "node-fetch";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_INGEST_URL,
  SCRAPER_SECRET_KEY,
} = process.env;

// ----- ENV VALIDATION -----
const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_INGEST_URL) missing.push("SUPABASE_INGEST_URL");
if (!SCRAPER_SECRET_KEY) missing.push("SCRAPER_SECRET_KEY");

if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  throw new Error("❌ Supabase env vars missing");
}

// ----- FETCH COMPANIES -----
export async function getCompanies() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }

  return res.json();
}

// ----- SEND JOBS (BATCHED) -----
export async function sendJobs(jobs, batchSize = 200) {
  if (!jobs.length) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  console.log(`📦 Sending ${jobs.length} jobs in batches of ${batchSize}`);

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(`❌ Batch ${i / batchSize + 1} failed:`, text);
      } else {
        console.log(`✅ Batch ${i / batchSize + 1} sent`);
      }
    } catch (err) {
      console.error(`❌ Batch ${i / batchSize + 1} error:`, err.message);
    }
  }
}
