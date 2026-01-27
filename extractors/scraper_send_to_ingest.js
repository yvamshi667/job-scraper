/**
 * Scrape Greenhouse jobs and POST them to Lovable Edge Function "ingest-jobs"
 * Works in ESM repos (package.json: "type": "module")
 *
 * Required ENV:
 *  - SEED_FILE
 *  - INGEST_JOBS_URL
 *  - SCRAPER_SECRET_KEY
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
  // helpful debug
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
      console.warn(
        `⚠️ ${label} failed ${attempt}/${MAX_RETRIES} status=${status || "n/a"} msg=${e?.message || e}`
      );
      await sleep(Math.min(3000, 300 * attempt * attempt));
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

async function fetchJobs(companySlug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    companySlug
  )}/jobs?content=true`;

  const res = await withRetry(
    async () =>
      axios.get(url, {
        timeout: 30_000,
        headers: { "User-Agent": "job-scraper/1.0", Accept: "application/json" },
      }),
    `fetch jobs ${companySlug}`
  );

  return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
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
    content_html: job.content ?? null,
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
          timeout: 60_000,
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
  console.log("📤 Sending to ingest:", INGEST_JOBS_URL);

  let totalFetched = 0;
  let totalSent = 0;
  let failures = 0;

  const BATCH_SIZE = 500;

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const idx = `${i + 1}/${companies.length}`;

    try {
      await sleep(REQUEST_DELAY_MS);

      const jobs = await fetchJobs(company.slug);
      totalFetched += jobs.length;

      const mapped = jobs
        .filter((j) => j && j.id != null)
        .map((j) => mapJob(company, j));

      for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
        const chunk = mapped.slice(s, s + BATCH_SIZE);
        await postBatch(chunk);
        totalSent += chunk.length;
        console.log(`✅ [${idx}] ${company.slug} sent ${chunk.length} (totalSent=${totalSent})`);
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
  console.log("Failures:", failures);
  console.log("====================================================");

  if (failures > 0) process.exitCode = 1;
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
