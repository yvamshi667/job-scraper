import fetch from "node-fetch";

/* =======================
   ENVIRONMENT VARIABLES
======================= */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_INGEST_URL = process.env.SUPABASE_INGEST_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !SUPABASE_INGEST_URL ||
  !SCRAPER_SECRET_KEY
) {
  throw new Error("❌ Supabase env vars missing");
}

/* =======================
   FETCH COMPANIES
======================= */
export async function getCompanies() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Failed to fetch companies:", text);
    throw new Error("Failed to fetch companies");
  }

  const companies = await res.json();
  console.log(`🏢 Companies loaded: ${companies.length}`);
  return companies;
}

/* =======================
   JOB SENDING LOGIC
======================= */
const BATCH_SIZE = 200;

/** Global dedupe */
function dedupeJobs(jobs) {
  const map = new Map();
  for (const job of jobs) {
    if (!job?.fingerprint) continue;
    map.set(job.fingerprint, job);
  }
  return [...map.values()];
}

/** Per-batch dedupe (CRITICAL) */
function dedupeBatch(batch) {
  const seen = new Set();
  return batch.filter(job => {
    if (seen.has(job.fingerprint)) return false;
    seen.add(job.fingerprint);
    return true;
  });
}

/* =======================
   SEND JOBS
======================= */
export async function sendJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.log("⚠️ No jobs to send");
    return;
  }

  console.log(`📦 Raw jobs: ${jobs.length}`);

  const dedupedJobs = dedupeJobs(jobs);
  console.log(`🧹 After global dedupe: ${dedupedJobs.length}`);

  const totalBatches = Math.ceil(dedupedJobs.length / BATCH_SIZE);

  for (let i = 0; i < dedupedJobs.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    const rawBatch = dedupedJobs.slice(i, i + BATCH_SIZE);
    const batch = dedupeBatch(rawBatch);

    if (batch.length === 0) {
      console.warn(`⚠️ Batch ${batchNumber} empty after dedupe, skipping`);
      continue;
    }

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(JSON.stringify(json));
      }

      console.log(
        `✅ Batch ${batchNumber}/${totalBatches} sent`,
        json
      );
    } catch (err) {
      console.error(
        `❌ Batch ${batchNumber}/${totalBatches} failed`,
        err.message
      );
    }
  }

  console.log("🎉 Job ingestion completed");
}
