// supabase.js
import fetch from "node-fetch";

/* =========================
   ENV
========================= */
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const INGEST_ENDPOINT = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : "";

/* =========================
   SAFETY CHECKS
========================= */
const hasSupabase =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  INGEST_ENDPOINT &&
  SCRAPER_SECRET_KEY;

/* =========================
   GET COMPANIES
========================= */
export async function getCompanies() {
  if (!hasSupabase) {
    console.warn(
      "⚠️ Supabase env vars missing. Returning empty company list."
    );
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
    const text = await res.text();
    console.error("❌ Failed to fetch companies:", text);
    return [];
  }

  return await res.json();
}

/* =========================
   SEND JOBS (FIXED)
========================= */
export async function sendJobs(jobs) {
  if (!hasSupabase) {
    console.warn("⚠️ Supabase config missing. Skipping sendJobs().");
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ sendJobs called with 0 jobs. Skipping.");
    return;
  }

  console.log(`📦 Jobs received for sending: ${jobs.length}`);

  /* -------------------------
     DEDUPLICATE (CRITICAL)
  ------------------------- */
  const seen = new Set();
  const deduped = [];

  for (const job of jobs) {
    if (!job || !job.fingerprint) continue;
    if (seen.has(job.fingerprint)) continue;
    seen.add(job.fingerprint);
    deduped.push(job);
  }

  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${deduped.length}`
  );

  if (deduped.length === 0) {
    console.warn("⚠️ All jobs removed during dedupe. Nothing to send.");
    return;
  }

  /* -------------------------
     BATCH SEND (200)
  ------------------------- */
  const BATCH_SIZE = 200;
  const totalBatches = Math.ceil(deduped.length / BATCH_SIZE);

  console.log(
    `🚀 Sending ${deduped.length} jobs in ${totalBatches} batches`
  );

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);

    if (batch.length === 0) {
      console.warn(`⚠️ Skipping empty batch at index ${i}`);
      continue;
    }

    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const res = await fetch(INGEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ jobs: batch }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          `❌ Batch ${batchNumber}/${totalBatches} failed:`,
          text
        );
        continue;
      }

      console.log(`✅ Batch ${batchNumber}/${totalBatches} sent`);
    } catch (err) {
      console.error(
        `❌ Batch ${batchNumber}/${totalBatches} exception:`,
        err.message
      );
    }
  }

  console.log("🎉 ALL JOB SEND ATTEMPTS COMPLETED");
}
