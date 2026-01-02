// supabase.js
import fetch from "node-fetch";

/* ----------------------------------
   ENV RESOLUTION (AUTO-FIXED)
----------------------------------- */

// URL
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

// SERVICE ROLE (fallback to anon if needed)
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

// INGEST FUNCTION URL
const SUPABASE_INGEST_URL =
  process.env.SUPABASE_INGEST_URL ||
  process.env.WEBHOOK_URL;

// SCRAPER AUTH
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

// Validate (NO HARD CRASH)
const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");
if (!SUPABASE_INGEST_URL) missing.push("SUPABASE_INGEST_URL or WEBHOOK_URL");
if (!SCRAPER_SECRET_KEY) missing.push("SCRAPER_SECRET_KEY");

if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
}

/* ----------------------------------
   GET COMPANIES
----------------------------------- */

export async function getCompanies() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }

  return await res.json();
}

/* ----------------------------------
   SEND JOBS (SAFE + DEDUPED)
----------------------------------- */

export async function sendJobs(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  // Hard dedupe by job_url
  const uniqueJobs = Array.from(
    new Map(jobs.filter(j => j.job_url).map(j => [j.job_url, j])).values()
  );

  console.log(`📦 Sending ${uniqueJobs.length} jobs in batches of 200`);

  const BATCH_SIZE = 200;
  const batches = [];

  for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
    batches.push(uniqueJobs.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "x-scraper-secret": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(`❌ Batch ${i + 1} failed:`, text);
      } else {
        console.log(`✅ Batch ${i + 1} sent`);
      }
    } catch (err) {
      console.error(`❌ Batch ${i + 1} error:`, err.message);
    }
  }

  console.log("🎉 ALL JOBS PROCESSED");
}
