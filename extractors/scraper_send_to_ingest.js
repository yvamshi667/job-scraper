/**
 * Greenhouse → Lovable ingest-jobs (ESM)
 *
 * Goals:
 * ✅ Scrape Greenhouse boards jobs (content=false => smaller payload)
 * ✅ Normalize URL to strict format: https://boards.greenhouse.io/<company>/jobs/<id>
 * ✅ Send to Lovable ingest endpoint with x-scraper-key header
 * ✅ Make data pass strict validators:
 *    - title never empty/too long
 *    - company_name always present
 *    - location_name always present
 *    - url always present & normalized
 *    - departments/offices safe strings
 * ✅ Skip 404 companies (not using Greenhouse)
 * ✅ Retry on transient errors
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

const SEED_FILE = process.env.SEED_FILE || "seeds/greenhouse-batch-001.json";
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

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const status = e?.response?.status;
      const msg = e?.message || String(e);
      console.warn(
        `⚠️ ${label} failed ${attempt}/${MAX_RETRIES} status=${status || "n/a"} msg=${msg}`
      );
      await sleep(Math.min(5000, 500 * attempt * attempt));
    }
  }
  throw lastErr;
}

// -------------------------
// Normalizers (validation-safe)
// -------------------------
function nonNullString(v, fallback = "") {
  const s = (v ?? "").toString().trim().replace(/\s+/g, " ");
  return s.length ? s : fallback;
}

function cleanTitle(t) {
  const s = nonNullString(t, "Unknown Title");
  return s.length > 140 ? s.slice(0, 140) : s;
}

function cleanCompanyName(name, slugFallback) {
  const s = nonNullString(name, "");
  return s.length ? s : nonNullString(slugFallback, "Unknown Company");
}

function cleanLocation(loc) {
  const s = nonNullString(loc, "");
  return s.length ? s : "Unspecified";
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

function normalizeGreenhouseUrl(companySlug, jobId) {
  if (!companySlug || !jobId) return null;
  return `https://boards.greenhouse.io/${companySlug}/jobs/${jobId}`;
}

function safeJsonStringify(v) {
  try {
    if (!v) return "";
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function isHttpUrl(u) {
  return typeof u === "string" && (u.startsWith("https://") || u.startsWith("http://"));
}

// -------------------------
// Greenhouse fetch
// -------------------------
async function fetchJobs(companySlug) {
  // content=false => smaller, faster, avoids 504s downstream
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

// -------------------------
// Mapping to Lovable schema
// -------------------------
function mapJob(company, job) {
  const jobId = job?.id;

  const url = normalizeGreenhouseUrl(company.slug, jobId);

  return {
    job_key: `${company.slug}:${jobId}`,
    company_name: cleanCompanyName(company.name, company.slug),
    company_slug: nonNullString(company.slug, "unknown"),
    greenhouse_job_id: jobId ?? null,
    title: cleanTitle(job?.title),
    location_name: cleanLocation(job?.location?.name),

    // ✅ strict URL format (validator-friendly)
    url,

    // ✅ keep payload small; you can enrich later if needed
    content_html: null,

    departments: nonNullString(safeJsonStringify(job?.departments), ""),
    offices: nonNullString(safeJsonStringify(job?.offices), ""),
    updated_at_source: nonNullString(job?.updated_at, ""),
    created_at_source: nonNullString(job?.created_at, ""),
    ingested_at: new Date().toISOString(),
    source: "greenhouse",
    is_active: true,
  };
}

// -------------------------
// POST to Lovable ingest-jobs
// -------------------------
async function postBatch(batch) {
  const headers = {
    "Content-Type": "application/json",

    // ✅ Lovable expects this header
    "x-scraper-key": SCRAPER_SECRET_KEY,

    // ✅ fallback (some implementations check Authorization)
    Authorization: `Bearer ${SCRAPER_SECRET_KEY}`,
  };

  try {
    const res = await axios.post(
      INGEST_JOBS_URL,
      { jobs: batch },
      {
        timeout: 180_000, // 3 minutes
        headers,
      }
    );
    return res.data;
  } catch (e) {
    const status = e?.response?.status;

    // Fail fast on auth problems
    if (status === 401 || status === 403) {
      console.error(`❌ Unauthorized (${status}) from ingest-jobs.`);
      console.error("Check Lovable expects header x-scraper-key and key matches exactly.");
      process.exit(1);
    }
    throw e;
  }
}

// -------------------------
// Main
// -------------------------
async function run() {
  const companies = JSON.parse(fs.readFileSync(seedPath, "utf8"))
    .map((c) => ({
      name: nonNullString(c?.name, ""),
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
  let failures = 0;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const idx = `${i + 1}/${companies.length}`;

    try {
      await sleep(REQUEST_DELAY_MS);

      const jobs = await fetchJobs(company.slug);

      if (!jobs.length) {
        skipped++;
        console.log(`⚠️ [${idx}] ${company.slug}: 0 jobs (skipped)`);
        continue;
      }

      totalFetched += jobs.length;

      const mapped = jobs
        .filter((j) => j?.id != null)
        .map((j) => mapJob(company, j))
        // ensure URL is present and valid
        .filter((r) => isHttpUrl(r.url));

      console.log(
        `📦 [${idx}] ${company.slug}: fetched=${jobs.length}, mapped=${mapped.length}, sending batches of ${BATCH_SIZE}`
      );

      for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
        const chunk = mapped.slice(s, s + BATCH_SIZE);
        await withRetry(async () => postBatch(chunk), `POST ingest batch size=${chunk.length}`);
        totalSent += chunk.length;
        console.log(`✅ [${idx}] ${company.slug}: sent ${chunk.length} (totalSent=${totalSent})`);
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
