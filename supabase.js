// supabase.js
import fetch from "node-fetch";

const REQUIRED_ENV_VARS = [
  "SUPABASE_INGEST_URL",
  "SCRAPER_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  throw new Error("❌ Supabase env vars missing");
}

export async function getCompanies() {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/companies`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }

  return res.json();
}

export async function sendJobs(jobs = []) {
  if (!jobs.length) {
    console.log("⚠️ No jobs to send — skipping ingestion");
    return;
  }

  const BATCH_SIZE = 200;

  console.log(`🚀 Sending ${jobs.length} jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(process.env.SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": process.env.SCRAPER_SECRET_KEY
        },
        body: JSON.stringify({ jobs: batch })
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, text);
      } else {
        console.log(`✅ Batch ${i / BATCH_SIZE + 1} sent`);
      }
    } catch (err) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} error`, err);
    }
  }
}
