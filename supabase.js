// supabase.js
import fetch from "node-fetch";

/* =========================
   ENV VARIABLES (SAFE LOAD)
========================= */
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const SUPABASE_INGEST_URL =
  process.env.SUPABASE_INGEST_URL ?? "";
export const SCRAPER_SECRET_KEY =
  process.env.SCRAPER_SECRET_KEY ?? "";

/* =========================
   ENV DEBUG (VERY IMPORTANT)
========================= */
const missing = [];

if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY)
  missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_INGEST_URL)
  missing.push("SUPABASE_INGEST_URL");
if (!SCRAPER_SECRET_KEY)
  missing.push("SCRAPER_SECRET_KEY");

if (missing.length) {
  console.error("❌ Missing env vars:", missing.join(", "));
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
   SEND JOBS (BATCH SAFE)
========================= */
export async function sendJobs(jobs, batchSize = 200) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  console.log(
    `📦 Raw jobs received: ${jobs.length}`
  );

  /* -------- DEDUP -------- */
  const seen = new Set();
  const deduped = [];

  for (const job of jobs) {
    if (!job?.fingerprint) continue;
    if (seen.has(job.fingerprint)) continue;
    seen.add(job.fingerprint);
    deduped.push(job);
  }

  console.log(
    `🧹 Deduplicated jobs: ${jobs.length} → ${deduped.length}`
  );

  /* -------- BATCH SEND -------- */
  let batchIndex = 0;

  for (let i = 0; i < deduped.length; i += batchSize) {
    batchIndex++;
    const batch = deduped.slice(i, i + batchSize);

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
          `❌ Batch ${batchIndex} failed`,
          data
        );
      } else {
        console.log(
          `✅ Batch ${batchIndex} sent`,
          data
        );
      }
    } catch (err) {
      console.error(
        `❌ Batch ${batchIndex} error`,
        err.message
      );
    }
  }

  console.log("🎉 Job ingestion finished");
}
