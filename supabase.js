// supabase.js
import fetch from "node-fetch";

/* =========================
   ENV VALIDATION
========================= */
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_INGEST_URL =
  process.env.SUPABASE_INGEST_URL;
export const SCRAPER_SECRET_KEY =
  process.env.SCRAPER_SECRET_KEY;

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  !SUPABASE_INGEST_URL ||
  !SCRAPER_SECRET_KEY
) {
  throw new Error("❌ Supabase env vars missing");
}

/* =========================
   FETCH COMPANIES
========================= */
export async function getCompanies() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Failed to fetch companies:", text);
    throw new Error("Failed to fetch companies");
  }

  return res.json();
}

/* =========================
   SEND JOBS (BATCHED + SAFE)
========================= */
export async function sendJobs(jobs, batchSize = 200) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  console.log(
    `📦 Sending ${jobs.length} jobs in batches of ${batchSize}`
  );

  /* -------------------------
     GLOBAL DEDUPLICATION
     (prevents ON CONFLICT error)
  -------------------------- */
  const seen = new Set();
  const dedupedJobs = [];

  for (const job of jobs) {
    if (!job?.fingerprint) continue;
    if (seen.has(job.fingerprint)) continue;
    seen.add(job.fingerprint);
    dedupedJobs.push(job);
  }

  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${dedupedJobs.length}`
  );

  /* -------------------------
     BATCH SEND
  -------------------------- */
  let batchNumber = 0;

  for (let i = 0; i < dedupedJobs.length; i += batchSize) {
    batchNumber++;
    const batch = dedupedJobs.slice(i, i + batchSize);

    if (batch.length === 0) {
      console.warn(`⚠️ Batch ${batchNumber} empty, skipping`);
      continue;
    }

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({
          source: "github_scraper",
          jobs: batch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(
          `❌ Batch ${batchNumber} failed:`,
          data
        );
      } else {
        console.log(
          `✅ Batch ${batchNumber} sent`,
          data
        );
      }
    } catch (err) {
      console.error(
        `❌ Batch ${batchNumber} network error:`,
        err.message
      );
    }
  }

  console.log("🎉 Job ingestion finished");
}
