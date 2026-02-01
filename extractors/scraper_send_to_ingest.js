/**
 * Greenhouse → Lovable ingest-jobs (ESM)
 *
 * FIXES:
 * ✅ Supports master seeds where entries are:
 *    - objects: { greenhouse_company: "airbnb" }
 *    - objects: { slug: "airbnb" }
 *    - objects: { gh: "airbnb" }
 *    - strings: "airbnb"
 * ✅ If slugs can't be detected, prints sample raw entries for debugging
 * ✅ Uses x-scraper-key header (Lovable)
 * ✅ Small payload: content=false, content_html=null
 * ✅ URL normalized: https://boards.greenhouse.io/<company>/jobs/<id>
 * ✅ Skips 404 boards cleanly
 *
 * Required ENV:
 *  - SEED_FILE
 *  - INGEST_JOBS_URL
 *  - SCRAPER_SECRET_KEY
 *
 * Optional ENV:
 *  - REQUEST_DELAY_MS (default 150)
 *  - MAX_RETRIES (default 3)
 *  - HOURS_BACK (default 24; set to 0 to disable filtering)
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SEED_FILE = process.env.SEED_FILE || "seeds/_runtime_shard.json";
const INGEST_JOBS_URL = process.env.INGEST_JOBS_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 150);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
const HOURS_BACK = Number(process.env.HOURS_BACK ?? 24); // if 0 -> no 24h filter

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

/**
 * Robust slug extractor:
 * Supports object seeds and string seeds.
 */
function extractCompanySlug(entry) {
  if (!entry) return null;

  // Seed entry can be a string: "airbnb"
  if (typeof entry === "string") {
    const s = entry.trim();
    return s.length ? s : null;
  }

  // Must be object-like
  if (typeof entry !== "object") return null;

  // Try many common keys
  return (
    entry.greenhouse_company ||
    entry.greenhouse_slug ||
    entry.greenhouse ||
    entry.greenhouseSlug ||
    entry.greenhouseCompany ||
    entry.gh ||
    entry.gh_slug ||
    entry.slug ||
    entry.company ||
    entry.id ||
    null
  );
}

/**
 * Robust company name extractor
 */
function extractCompanyName(entry, slug) {
  if (!entry) return slug || "Unknown";

  if (typeof entry === "string") return slug || entry;

  if (typeof entry === "object") {
    return entry.name || entry.company_name || entry.companyName || slug || "Unknown";
  }

  return slug || "Unknown";
}

function normalizeGreenhouseUrl(companySlug, jobId) {
  if (!companySlug || !jobId) return null;
  return `https://boards.greenhouse.io/${companySlug}/jobs/${jobId}`;
}

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

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
    url,
    content_html: null,
    departments: job?.departments ? JSON.stringify(job.departments) : "",
    offices: job?.offices ? JSON.stringify(job.offices) : "",
    updated_at_source: nonNullString(job?.updated_at, ""),
    created_at_source: nonNullString(job?.created_at, ""),
    ingested_at: new Date().toISOString(),
    source: "greenhouse",
    is_active: true,
  };
}

async function postBatch(batch) {
  const headers = {
    "Content-Type": "application/json",
    "x-scraper-key": SCRAPER_SECRET_KEY,
    Authorization: `Bearer ${SCRAPER_SECRET_KEY}`,
  };

  const res = await axios.post(
    INGEST_JOBS_URL,
    { jobs: batch },
    { timeout: 180_000, headers }
  );
  return res.data;
}

async function run() {
  const cutoff = HOURS_BACK > 0 ? new Date(Date.now() - HOURS_BACK * 60 * 60 * 1000) : null;

  let seed;
  try {
    seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  } catch (e) {
    console.error("❌ SEED_FILE is not valid JSON:", SEED_FILE);
    console.error(e?.message || e);
    process.exit(1);
  }

  if (!Array.isArray(seed)) {
    console.error("❌ SEED_FILE must be a JSON array:", SEED_FILE);
    process.exit(1);
  }

  const companies = seed
    .map((entry) => {
      const slug = extractCompanySlug(entry);
      return {
        slug: slug ? String(slug).trim() : null,
        name: extractCompanyName(entry, slug),
        raw: entry,
      };
    })
    .filter((c) => c.slug);

  console.log("✅ SEED_FILE:", SEED_FILE);
  console.log("🏢 Companies:", companies.length);
  if (cutoff) console.log("⏱️ HOURS_BACK:", HOURS_BACK, "cutoff:", cutoff.toISOString());
  console.log("📤 Sending to ingest:", "***");

  // Helpful debug if 0 companies detected
  if (companies.length === 0) {
    console.error("❌ No company slugs detected from seed.");
    console.error("Here are 3 raw seed entries to show the format:");
    console.error(JSON.stringify(seed.slice(0, 3), null, 2));
    console.error(
      "✅ Fix: ensure entries are strings like 'airbnb' OR objects with keys like greenhouse_company/slug/gh."
    );
    process.exit(1);
  }

  const BATCH_SIZE = 100;

  let totalFetched = 0;
  let totalFiltered = 0;
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

      const filtered = cutoff
        ? jobs.filter((j) => {
            const d = parseDateSafe(j?.updated_at);
            return d && d >= cutoff;
          })
        : jobs;

      totalFiltered += filtered.length;

      if (!filtered.length) {
        console.log(`⚠️ [${idx}] ${company.slug}: 0 jobs in window`);
        continue;
      }

      const mapped = filtered
        .filter((j) => j?.id != null)
        .map((j) => mapJob(company, j))
        .filter((r) => r.url && typeof r.url === "string");

      console.log(
        `📦 [${idx}] ${company.slug}: fetched=${jobs.length}, window=${filtered.length}, sending batches of ${BATCH_SIZE}`
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
  console.log("Filtered:", totalFiltered);
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
