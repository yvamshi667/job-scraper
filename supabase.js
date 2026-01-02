// supabase.js
import fetch from "node-fetch";

const REQUIRED = ["SUPABASE_INGEST_URL", "SCRAPER_SECRET_KEY"];
const missing = REQUIRED.filter(k => !process.env[k]);

if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
  process.exit(1);
}

const INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

export async function sendJobs(jobs = []) {
  if (!jobs.length) {
    console.log("⚠️ No jobs to send");
    return;
  }

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`❌ Ingest failed (${res.status}): ${text}`);
  }

  console.log(`✅ Ingest success: ${text}`);
}
