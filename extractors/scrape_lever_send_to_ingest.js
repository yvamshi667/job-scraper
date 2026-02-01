/**
 * Lever → Lovable ingest-jobs (ESM) — LAST 24H by createdAt/updatedAt when available
 *
 * Seed format: [{ name, lever_company }]
 * Endpoint: https://api.lever.co/v0/postings/{company}?mode=json
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

function parseDateSafe(msOrStr) {
  if (msOrStr == null) return null;
  const d = typeof msOrStr === "number" ? new Date(msOrStr) : new Date(String(msOrStr));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeLeverUrl(company, posting) {
  // Lever provides hosted URLs in posting.hostedUrl
  return posting?.hostedUrl || `https://jobs.lever.co/${company}/${posting?.id || ""}`;
}

async function fetchLever(company) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`;
  const res = await withRetry(
    async () => axios.get(url, { timeout: 30_000, validateStatus: () => true }),
    `fetch lever ${company}`
  );
  if (res.status === 404) return [];
  if (res.status !== 200) throw new Error(`Lever status ${res.status}`);
  return Array.isArray(res.data) ? res.data : [];
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
    .map((c) => ({ name: c.name || c.lever_company, slug: c.lever_company }))
    .filter((c) => c.slug);

  console.log("✅ Lever seed:", SEED_FILE, "companies:", companies.length);

  const BATCH_SIZE = 100;
  let sent = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    await sleep(REQUEST_DELAY_MS);

    const postings = await fetchLever(c.slug);

    const filtered = cutoff
      ? postings.filter((p) => {
          const d = parseDateSafe(p?.createdAt || p?.updatedAt);
          return d && d >= cutoff;
        })
      : postings;

    if (!filtered.length) continue;

    const mapped = filtered.map((p) => ({
      job_key: `${c.slug}:${p.id}`,
      company_name: c.name,
      company_slug: c.slug,
      title: p.text || p.title || "Unknown Title",
      location_name: p.categories?.location || "Unspecified",
      url: normalizeLeverUrl(c.slug, p),
      content_html: null,
      departments: p.categories?.department ? JSON.stringify([p.categories.department]) : "",
      offices: p.categories?.team ? JSON.stringify([p.categories.team]) : "",
      updated_at_source: "",
      created_at_source: "",
      ingested_at: new Date().toISOString(),
      source: "lever",
      is_active: true
    }));

    for (let s = 0; s < mapped.length; s += BATCH_SIZE) {
      const chunk = mapped.slice(s, s + BATCH_SIZE);
      await withRetry(async () => postBatch(chunk), `POST ingest batch size=${chunk.length}`);
      sent += chunk.length;
      console.log(`✅ Lever ${i + 1}/${companies.length} ${c.slug}: sent ${chunk.length} (total=${sent})`);
    }
  }

  console.log("✅ Lever done. totalSent=", sent);
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
