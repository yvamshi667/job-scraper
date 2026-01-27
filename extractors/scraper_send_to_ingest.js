/**
 * Greenhouse → Lovable ingest-jobs (ESM)
 *
 * Fixes:
 * ✅ Uses correct auth header: x-scraper-key (Lovable expects this)
 * ✅ Also sends Authorization: Bearer <key> fallback
 * ✅ FAIL FAST on 401/403 (stops the run immediately)
 * ✅ Skips Greenhouse 404 companies cleanly
 * ✅ Small payload (no HTML) to avoid 504 timeouts
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
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function fetchJobs(companySlug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    companySlug
  )}/jobs?content=false`;

  try {
    const res = await axios.get(url, {
      timeout: 30_000,
      headers: { "User-Agent": "job-scraper/1.0", Accept: "application/json" },
    });
    return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
  } catch (e) {
    if (e?.response?.status === 404) {
      console.log(`ℹ️ ${companySlug} is not using Greenhouse (404). Skipping.`);
      return [];
    }
    throw e;
  }
}

function mapJob(company, job) {
  return {
    job_key: `${company.slug}:${job.id}`,
    company_name: company.name,
    company_slug: company.slug,
    greenhouse_job_id: job.id,
    title: job.title ?? null,
    location_name: job.location?.name ?? null,
    url: job.absolute_url ?? null,
    content_html: null, // keep payload small
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
  const headers = {
    "Content-Type": "application/json",

    // ✅ Correct header per Lovable: x-scraper-key
    "x-scraper-key": SCRAPER_SECRET_KEY,

    // ✅ Fallback if edge function checks Authorization
    Authorization: `Bearer ${SCRAPER_SECRET_KEY}`,
  };

  try {
    const res = await axios.post(
      INGEST_JOBS_URL,
      { jobs: batch },
      {
        timeout: 180_000,
        headers,
      }
    );
    return res.data;
  } catch (e) {
    const status = e?.response?.status;

    // ✅ FAIL FAST for auth errors
    if (status === 401 || status === 403) {
      console.error("❌ AUTH ERROR from ingest-jobs:", status);
      console.error("Likely causes:");
      console.error("1) Lovable expects header: x-scraper-key (we are sending it now)");
      console.error("2) The key value doesn't match Lovable env SCRAPER_SECRET_KEY");
      console.error("3) You're hitting the wrong INGEST_JOBS_URL");
      process.exit(1);
    }

    throw e;
  }
}

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

  const BATCH_SIZE = 100;

  let totalFetched = 0;
  let totalSent = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const idx = `${i + 1}/${companies.length}`;

    await sleep(REQUEST_DELAY_MS);

    const jobs = await fetchJobs(company.slug);
    if (jobs.length === 0) {
      skipped++;
      console.log(`⚠️ [${idx}] ${company.slug}: 0 jobs (skipped)`);
      continue;
    }

    totalFetched += jobs.length;
    const mapped = jobs.filter((j) => j?.id != null).map((j) => mapJob(company, j));

    console.log(`📦 [${idx}] ${company.slug}: fetched=${jobs.length}, sending batches of ${BATCH_SIZE}`);

    for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
      const chunk = mapped.slice(s, s + BATCH_SIZE);
      await withRetry(async () => postBatch(chunk), `POST ingest batch size=${chunk.length}`);
      totalSent += chunk.length;
      console.log(`✅ [${idx}] ${company.slug}: sent ${chunk.length} (totalSent=${totalSent})`);
    }
  }

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Fetched:", totalFetched);
  console.log("Sent:", totalSent);
  console.log("Skipped:", skipped);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
