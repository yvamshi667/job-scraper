/**
 * Scrape Greenhouse jobs and POST them to Lovable Edge Function "ingest-jobs"
 * Works in ESM repos (package.json: "type": "module")
 *
 * FIXES INCLUDED:
 * ✅ Avoid 504 timeouts by NOT fetching/sending heavy HTML content
 *    - Greenhouse API: content=false
 *    - content_html: null
 * ✅ Skip Greenhouse 404 companies (not using Greenhouse)
 * ✅ Smaller payload + batch=100 => stable ingestion
 * ✅ POST timeout increased to 3 minutes
 * ✅ Retry + progress logs
 *
 * Required ENV:
 *  - SEED_FILE
 *  - INGEST_JOBS_URL
 *  - SCRAPER_SECRET_KEY
 *
 * Optional ENV:
 *  - REQUEST_DELAY_MS (default 150)
 *  - MAX_RETRIES (default 3)
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SEED_FILE = process.env.SEED_FILE || "seeds/greenhouse-us.json";
const INGEST_JOBS_URL = process.env.INGEST_JOBS_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 150);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

if (!INGEST_JOBS_URL || !SCRAPER_SECRET_KEY) {
  console.error("❌ Missing env vars: INGEST_JOBS_URL and/or SCRAPER_SECRET_KEY");
  process.exit(1);
}

const seedPath = path.resolve(process.cwd(), SEED_FILE);
if (!fs.existsSync(seedPath)) {
  console.error(`❌ Seed file not found: ${seedPath}`);
  const seedsDir = path.resolve(process.cwd(), "seeds");
  if (fs.existsSync(seedsDir)) {
    console.error("📂 Available files in /seeds:");
    for (const f of fs.readdirSync(seedsDir)) console.error(" -", f);
  } else {
    console.error("❌ No /seeds directory found.");
  }
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      const msg = e?.message || String(e);
      console.warn(`⚠️ ${label} failed ${attempt}/${MAX_RETRIES} status=${status || "n/a"} msg=${msg}`);
      await sleep(Math.min(5000, 500 * attempt * attempt));
    }
  }
  throw lastErr;
}

function normalizeSlug(c) {
  return (
    c.greenhouse_company ||
    c.greenhouse_slug ||
    c.slug ||
    c.company ||
    c.gh ||
    null
  );
}

/**
 * Fetch jobs from Greenhouse Boards API.
 * IMPORTANT: content=false => smaller payload => faster + avoids timeouts downstream
 */
async function fetchJobs(companySlug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    companySlug
  )}/jobs?content=false`;

  try {
    const res = await withRetry(
      async () =>
        axios.get(url, {
          timeout: 30_000,
          headers: { "User-Agent": "job-scraper/1.0", Accept: "application/json" },
        }),
      `fetch jobs ${companySlug}`
    );

    return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
  } catch (e) {
    if (e?.response?.status === 404) {
      console.log(`ℹ️ ${companySlug} is not using Greenhouse (404). Skipping.`);
      return [];
    }
    throw e;
  }
}

/**
 * Map to your Lovable/Supabase schema.
 * IMPORTANT: content_html=null to keep payload small and stop 504 errors.
 */
function mapJob(company, job) {
  return {
    job_key: `${company.slug}:${job.id}`,
    company_name: company.name,
    company_slug: company.slug,
    greenhouse_job_id: job.id,
    title: job.title ?? null,
    location_name: job.location?.name ?? null,
    url: job.absolute_url ?? null,

    // ✅ Critical for stability (no heavy HTML)
    content_html: null,

    departments: job.departments ? JSON.stringify(job.departments) : null,
    offices: job.offices ? JSON.stringify(job.offices) : null,
    updated_at_source: job.updated_at ?? null,
    created_at_source: job.created_at ?? null,
    ingested_at: new Date().toISOString(),
    source: "greenhouse",
    is_active: true,
  };
}

async function postBatch(batch) {
  const res = await withRetry(
    async () =>
      axios.post(
        INGEST_JOBS_URL,
        { jobs: batch },
        {
          timeout: 180_000, // 3 minutes
          headers: {
            "Content-Type": "application/json",
            "x-scraper-secret": SCRAPER_SECRET_KEY,
          },
        }
      ),
    `POST ingest batch size=${batch.length}`
  );
  return res.data;
}

async function run() {
  const companies = JSON.parse(fs.readFileSync(seedPath, "utf8"))
    .map((c) => ({
      name: c.name || normalizeSlug(c) || "Unknown",
      slug: normalizeSlug(c),
    }))
    .filter((c) => c.slug);

  console.log("✅ SEED_FILE:", SEED_FILE);
  console.log("🏢 Companies:", companies.length);
  console.log("📤 Sending to ingest:", "***");

  let totalFetched = 0;
  let totalSent = 0;
  let failures = 0;
  let skipped = 0;

  const BATCH_SIZE = 100; // safe now because payload is small

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const idx = `${i + 1}/${companies.length}`;

    try {
      await sleep(REQUEST_DELAY_MS);

      const jobs = await fetchJobs(company.slug);

      if (jobs.length === 0) {
        skipped++;
        console.log(`⚠️ [${idx}] ${company.slug}: 0 jobs (skipped)`);
        continue;
      }

      totalFetched += jobs.length;

      const mapped = jobs
        .filter((j) => j && j.id != null)
        .map((j) => mapJob(company, j));

      console.log(`📦 [${idx}] ${company.slug}: fetched=${jobs.length}, sending batches of ${BATCH_SIZE}`);

      for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
        const chunk = mapped.slice(s, s + BATCH_SIZE);
        await postBatch(chunk);
        totalSent += chunk.length;

        console.log(
          `✅ [${idx}] ${company.slug}: sent ${chunk.length} (progress=${Math.min(
            s + chunk.length,
            mapped.length
          )}/${mapped.length}, totalSent=${totalSent})`
        );
      }
    } catch (e) {
      failures++;
      console.error(`❌ [${idx}] ${company.slug} failed:`, e?.message || e);
    }
  }

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Fetched:", totalFetched);
  console.log("Sent:", totalSent);
  console.log("Skipped:", skipped);
  console.log("Failures:", failures);
  console.log("====================================================");

  if (failures > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
