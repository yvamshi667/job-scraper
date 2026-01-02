// supabase.js
import fetch from "node-fetch";

/* ================================
   SAFE ENV RESOLUTION (NO THROW)
================================ */

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const SUPABASE_INGEST_URL =
  process.env.SUPABASE_INGEST_URL ||
  process.env.WEBHOOK_URL ||
  "";

const SCRAPER_SECRET_KEY =
  process.env.SCRAPER_SECRET_KEY ||
  "";

/* ================================
   WARN ONLY — NEVER CRASH
================================ */

const missing = [];
if (!SUPABASE_URL) missing.push("SUPABASE_URL");
if (!SUPABASE_KEY) missing.push("SUPABASE_ANON_KEY");
if (!SUPABASE_INGEST_URL) missing.push("WEBHOOK_URL");
if (!SCRAPER_SECRET_KEY) missing.push("SCRAPER_SECRET_KEY");

if (missing.length) {
  console.warn("⚠️ Missing env vars (continuing anyway):", missing.join(", "));
}

/* ================================
   GET COMPANIES
================================ */

export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️ Supabase not configured — returning empty companies");
    return [];
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("❌ Failed to fetch companies:", await res.text());
    return [];
  }

  return await res.json();
}

/* ================================
   SEND JOBS (BATCH SAFE)
================================ */

export async function sendJobs(jobs = []) {
  if (!SUPABASE_INGEST_URL) {
    console.warn("⚠️ WEBHOOK_URL missing — skipping job ingestion");
    return;
  }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  // HARD DEDUPE BY URL (fixes ON CONFLICT bug)
  const deduped = Array.from(
    new Map(
      jobs
        .filter(j => j?.job_url)
        .map(j => [j.job_url, j])
    ).values()
  );

  console.log(`📦 Sending ${deduped.length} jobs`);

  const BATCH_SIZE = 200;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(SUPABASE_INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SUPABASE_KEY && { Authorization: `Bearer ${SUPABASE_KEY}` }),
          ...(SCRAPER_SECRET_KEY && { "x-scraper-key": SCRAPER_SECRET_KEY }),
        },
        body: JSON.stringify({ jobs: batch }),
      });

      if (!res.ok) {
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, await res.text());
      } else {
        console.log(`✅ Batch ${i / BATCH_SIZE + 1} sent`);
      }
    } catch (err) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} error:`, err.message);
    }
  }

  console.log("🎉 ALL JOBS PROCESSED");
}
