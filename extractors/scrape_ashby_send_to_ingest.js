/**
 * Ashby → Lovable ingest-jobs (ESM) — LAST 24H by updatedAt/createdAt when available
 *
 * Seed format: [{ name, ashby_company }]
 * Endpoint: https://api.ashbyhq.com/posting-api/job-board/{org}
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SEED_FILE = process.env.SEED_FILE;
const INGEST_JOBS_URL = process.env.INGEST_JOBS_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 150);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);
const HOURS_BACK = Number(process.env.HOURS_BACK ?? 24);

if (!SEED_FILE || !INGEST_JOBS_URL || !SCRAPER_SECRET_KEY) {
  console.error("❌ Missing env vars: SEED_FILE, INGEST_JOBS_URL, SCRAPER_SECRET_KEY");
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
      console.warn(`⚠️ ${label} failed ${attempt}/${MAX_RETRIES} status=${status || "n/a"} msg=${e?.message || e}`);
      await sleep(Math.min(5000, 500 * attempt * attempt));
    }
  }
  throw lastErr;
}

function parseDateSafe(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchAshby(org) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}`;
  const res = await withRetry(
    async () => axios.get(url, { timeout: 30_000, validateStatus: () => true }),
    `fetch ashby ${org}`
  );
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`Ashby status ${res.status}`);
  return res.data;
}

async function postBatch(batch) {
  const headers = {
    "Content-Type": "application/json",
    "x-scraper-key": SCRAPER_SECRET_KEY,
    Authorization: `Bearer ${SCRAPER_SECRET_KEY}`
  };
  await axios.post(INGEST_JOBS_URL, { jobs: batch }, { timeout: 180_000, headers });
}

async function run() {
  const cutoff = HOURS_BACK > 0 ? new Date(Date.now() - HOURS_BACK * 60 * 60 * 1000) : null;

  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const companies = seed
    .map((c) => ({ name: c.name || c.ashby_company, slug: c.ashby_company }))
    .filter((c) => c.slug);

  console.log("✅ Ashby seed:", SEED_FILE, "companies:", companies.length);

  const BATCH_SIZE = 100;
  let sent = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    await sleep(REQUEST_DELAY_MS);

    const payload = await fetchAshby(c.slug);
    if (!payload) continue;

    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    const filtered = cutoff
      ? jobs.filter((j) => {
          const d = parseDateSafe(j?.updatedAt || j?.createdAt);
          return d && d >= cutoff;
        })
      : jobs;

    if (!filtered.length) continue;

    const mapped = filtered.map((j) => ({
      job_key: `${c.slug}:${j.id}`,
      company_name: c.name,
      company_slug: c.slug,
      title: j.title || "Unknown Title",
      location_name: j.location || "Unspecified",
      url: j.applyUrl || `https://jobs.ashbyhq.com/${c.slug}`,
      content_html: null,
      departments: j.department ? JSON.stringify([j.department]) : "",
      offices: j.team ? JSON.stringify([j.team]) : "",
      updated_at_source: "",
      created_at_source: "",
      ingested_at: new Date().toISOString(),
      source: "ashby",
      is_active: true
    }));

    for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
      const chunk = mapped.slice(s, s + BATCH_SIZE);
      await withRetry(async () => postBatch(chunk), `POST ingest batch size=${chunk.length}`);
      sent += chunk.length;
      console.log(`✅ Ashby ${i + 1}/${companies.length} ${c.slug}: sent ${chunk.length} (total=${sent})`);
    }
  }

  console.log("✅ Ashby done. totalSent=", sent);
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
