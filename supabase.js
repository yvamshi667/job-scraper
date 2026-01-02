// supabase.js
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const INGEST_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

/**
 * SAFE company fetch — never throws
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️ Supabase env vars missing. Returning empty companies.");
    return [];
  }

  try {
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

    return await res.json();
  } catch (err) {
    console.error("❌ Company fetch error:", err.message);
    return [];
  }
}

/**
 * FINAL FIXED sendJobs
 */
export async function sendJobs(jobs) {
  if (!INGEST_URL || !SCRAPER_SECRET_KEY) {
    console.warn("⚠️ Ingest disabled — missing env vars.");
    return;
  }

  // 🔑 GLOBAL DEDUPLICATION BY fingerprint
  const uniqueMap = new Map();
  for (const job of jobs) {
    if (job.fingerprint) {
      uniqueMap.set(job.fingerprint, job);
    }
  }

  const uniqueJobs = [...uniqueMap.values()];
  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${uniqueJobs.length}`
  );

  const BATCH_SIZE = 200;

  console.log(
    `🚀 Sending ${uniqueJobs.length} jobs in batches of ${BATCH_SIZE}`
  );

  for (let i = 0; i < uniqueJobs.length; i += BATCH_SIZE) {
    const rawBatch = uniqueJobs.slice(i, i + BATCH_SIZE);

    // 🧼 EXTRA SAFETY: dedupe INSIDE batch
    const batchMap = new Map();
    for (const job of rawBatch) {
      batchMap.set(job.fingerprint, job);
    }
    const batch = [...batchMap.values()];

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
        console.error(
          `❌ Batch ${i / BATCH_SIZE + 1} failed:`,
          await res.text()
        );
        continue;
      }

      console.log(`✅ Batch ${i / BATCH_SIZE + 1} sent`);
    } catch (err) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} error:`, err.message);
    }
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}
