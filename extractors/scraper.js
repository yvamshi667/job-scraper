/**
 * ============================================================
 * Greenhouse Job Scraper -> Supabase (Batch Seed Friendly)
 * ============================================================
 *
 * ✅ Reads seed file from SEED_FILE env var
 * ✅ Fetches jobs from Greenhouse Boards API
 * ✅ Upserts jobs into Supabase (dedupe by "job_key")
 * ✅ Retry + simple throttle
 *
 * Required ENV:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional ENV:
 *   - SEED_FILE (default: seeds/greenhouse-us.json)
 *   - SUPABASE_TABLE (default: greenhouse_jobs)
 *   - REQUEST_DELAY_MS (default: 250)
 *   - MAX_RETRIES (default: 3)
 *
 * Seed file format (array of companies):
 * [
 *   { "name": "Acme", "greenhouse_company": "acme" },
 *   { "name": "Stripe", "greenhouse_company": "stripe" }
 * ]
 */

"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// ------------------------
// Config
// ------------------------
const SEED_FILE = process.env.SEED_FILE || "seeds/greenhouse-us.json";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "greenhouse_jobs";

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 250);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required env vars:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const seedPath = path.resolve(process.cwd(), SEED_FILE);
if (!fs.existsSync(seedPath)) {
  console.error(`❌ Seed file not found: ${seedPath}`);
  process.exit(1);
}

// ------------------------
// Utilities
// ------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, label = "operation") {
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const msg = err?.message || String(err);

      console.warn(`⚠️ ${label} failed (attempt ${attempt}/${MAX_RETRIES}) status=${status || "n/a"} msg=${msg}`);

      // backoff
      const backoff = Math.min(2000, 250 * attempt * attempt);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function safeString(v) {
  if (v === null || v === undefined) return null;
  return String(v);
}

function normalizeCompanySlug(company) {
  // Support multiple possible keys in your seed objects
  return (
    company.greenhouse_company ||
    company.greenhouse_slug ||
    company.slug ||
    company.company ||
    company.gh ||
    null
  );
}

function greenhouseJobsUrl(companySlug) {
  // Greenhouse Boards JSON endpoint
  // Example: https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companySlug)}/jobs?content=true`;
}

// ------------------------
// Supabase Client
// ------------------------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ------------------------
// Main logic
// ------------------------
async function loadSeedCompanies() {
  const raw = fs.readFileSync(seedPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Seed JSON must be an array. Got: ${typeof parsed}`);
  }

  const cleaned = parsed
    .map((c) => {
      const slug = normalizeCompanySlug(c);
      return {
        name: c.name || slug || "Unknown",
        slug,
        raw: c,
      };
    })
    .filter((c) => c.slug);

  if (cleaned.length === 0) {
    throw new Error("Seed contains 0 valid companies with greenhouse slug.");
  }

  return cleaned;
}

async function fetchGreenhouseJobs(companySlug) {
  const url = greenhouseJobsUrl(companySlug);

  const res = await withRetry(
    async () => {
      const r = await axios.get(url, {
        timeout: 30_000,
        headers: {
          "User-Agent": "job-scraper/1.0",
          Accept: "application/json",
        },
      });
      return r;
    },
    `fetch jobs for ${companySlug}`
  );

  const data = res.data;

  // Expected: { jobs: [...] }
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs;
}

function mapGreenhouseJobToRow(company, job) {
  // Create a stable unique key (dedupe key)
  // Greenhouse job id is numeric and stable per company.
  const jobId = job?.id;
  const jobKey = `${company.slug}:${jobId}`;

  return {
    // --- Dedupe key (must have UNIQUE index in Supabase) ---
    job_key: jobKey,

    // --- Company ---
    company_name: safeString(company.name),
    company_slug: safeString(company.slug),

    // --- Job basics ---
    greenhouse_job_id: jobId ?? null,
    title: safeString(job?.title),
    location_name: safeString(job?.location?.name),

    // --- URLs ---
    // job.absolute_url is usually present
    url: safeString(job?.absolute_url),

    // --- Content ---
    // content is HTML when content=true
    content_html: safeString(job?.content),
    departments: job?.departments ? JSON.stringify(job.departments) : null,
    offices: job?.offices ? JSON.stringify(job.offices) : null,

    // --- Metadata ---
    updated_at_source: safeString(job?.updated_at),
    created_at_source: safeString(job?.created_at),

    // --- Timestamp for your pipeline ---
    ingested_at: new Date().toISOString(),
    source: "greenhouse",
  };
}

async function upsertJobs(rows) {
  if (!rows.length) return { upserted: 0 };

  // Upsert by job_key (must be UNIQUE in table)
  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .upsert(rows, { onConflict: "job_key" })
    .select("job_key");

  if (error) {
    throw new Error(`Supabase upsert error: ${error.message}`);
  }

  return { upserted: data?.length || 0 };
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Greenhouse Job Scraper starting");
  console.log("✅ SEED_FILE:", SEED_FILE);
  console.log("✅ SUPABASE_TABLE:", SUPABASE_TABLE);
  console.log("✅ REQUEST_DELAY_MS:", REQUEST_DELAY_MS);
  console.log("✅ MAX_RETRIES:", MAX_RETRIES);
  console.log("====================================================");

  const companies = await loadSeedCompanies();

  console.log(`🏢 Companies loaded: ${companies.length}`);
  console.log("----------------------------------------------------");

  let totalFetched = 0;
  let totalUpserted = 0;
  let failures = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const idx = `${i + 1}/${companies.length}`;

    console.log(`\n🔎 [${idx}] Fetching: ${c.name} (${c.slug})`);

    try {
      // throttle between companies
      if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);

      const jobs = await fetchGreenhouseJobs(c.slug);
      console.log(`✅ Jobs fetched: ${jobs.length}`);

      totalFetched += jobs.length;

      // Map to DB rows
      const rows = jobs
        .filter((j) => j && j.id != null)
        .map((j) => mapGreenhouseJobToRow(c, j));

      // Upsert in chunks to avoid large payloads
      const CHUNK_SIZE = 500;
      let companyUpserted = 0;

      for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
        const chunk = rows.slice(start, start + CHUNK_SIZE);
        const result = await withRetry(
          async () => upsertJobs(chunk),
          `supabase upsert ${c.slug} rows ${start}-${start + chunk.length - 1}`
        );
        companyUpserted += result.upserted;
      }

      totalUpserted += companyUpserted;
      console.log(`💾 Upserted rows: ${companyUpserted}`);
    } catch (err) {
      failures++;
      const status = err?.response?.status;
      const msg = err?.message || String(err);
      console.error(`❌ Failed company: ${c.slug} status=${status || "n/a"} msg=${msg}`);
    }
  }

  console.log("\n====================================================");
  console.log("✅ Scrape finished");
  console.log("📦 Total jobs fetched:", totalFetched);
  console.log("💾 Total rows upserted:", totalUpserted);
  console.log("⚠️ Company failures:", failures);
  console.log("====================================================");

  if (failures > 0) process.exitCode = 1; // mark action as failed if you want
}

run().catch((e) => {
  console.error("❌ Fatal error:", e?.message || e);
  process.exit(1);
});
