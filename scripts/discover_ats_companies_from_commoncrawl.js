/**
 * Discover ATS company slugs from Common Crawl CDX index (ESM)
 * Robust against Common Crawl 503/429 overload.
 *
 * Output:
 *  - seeds/greenhouse-master.json
 *  - seeds/lever-master.json
 *  - seeds/ashby-master.json
 *  - seeds/discovery-summary.json
 *
 * ENV (optional):
 *  - TARGET_GREENHOUSE (default 20000)
 *  - TARGET_LEVER (default 10000)
 *  - TARGET_ASHBY (default 5000)
 *  - LATEST_CRAWLS (default 5)
 *  - MAX_PAGES_PER_CRAWL (default 50)
 *  - VALIDATE (default true)
 *  - OUT_DIR (default seeds)
 *  - CDX_MIN_DELAY_MS (default 600)     delay between CDX requests
 *  - CDX_MAX_RETRIES (default 8)        retries on 429/503/etc
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const OUT_DIR = process.env.OUT_DIR || "seeds";

const TARGET_GREENHOUSE = Number(process.env.TARGET_GREENHOUSE || 20000);
const TARGET_LEVER = Number(process.env.TARGET_LEVER || 10000);
const TARGET_ASHBY = Number(process.env.TARGET_ASHBY || 5000);

const LATEST_CRAWLS = Number(process.env.LATEST_CRAWLS || 5);
const MAX_PAGES_PER_CRAWL = Number(process.env.MAX_PAGES_PER_CRAWL || 50);

const VALIDATE = (process.env.VALIDATE ?? "true").toLowerCase() !== "false";

const CDX_MIN_DELAY_MS = Number(process.env.CDX_MIN_DELAY_MS || 600);
const CDX_MAX_RETRIES = Number(process.env.CDX_MAX_RETRIES || 8);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCdxJson(text) {
  const raw = String(text);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // ignore
    }
  }
  return out;
}

function extractSlugFromUrl(u) {
  try {
    const url = new URL(u);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length ? parts[0] : null;
  } catch {
    return null;
  }
}

function uniqPush(set, arr, v) {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  if (set.has(s)) return false;
  set.add(s);
  arr.push(s);
  return true;
}

// Retry wrapper for CDX calls (handles 429/503/etc)
async function httpGetTextWithRetry(url, label) {
  let lastErr = null;

  for (let attempt = 1; attempt <= CDX_MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 30_000,
        responseType: "text",
        validateStatus: () => true
      });

      // Success
      if (res.status >= 200 && res.status < 300) {
        return res.data;
      }

      // Retriable statuses
      const retriable = [429, 500, 502, 503, 504, 520, 522, 523, 524];
      if (retriable.includes(res.status)) {
        const backoff = Math.min(15_000, CDX_MIN_DELAY_MS * attempt * attempt);
        console.warn(`⚠️ ${label} HTTP ${res.status} (attempt ${attempt}/${CDX_MAX_RETRIES}) backoff=${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      // Non-retriable (treat as empty result, don't crash whole run)
      console.warn(`⚠️ ${label} HTTP ${res.status} (non-retriable) -> treating as empty`);
      return "";
    } catch (e) {
      lastErr = e;
      const backoff = Math.min(15_000, CDX_MIN_DELAY_MS * attempt * attempt);
      console.warn(`⚠️ ${label} error (attempt ${attempt}/${CDX_MAX_RETRIES}) msg=${e?.message || e} backoff=${backoff}ms`);
      await sleep(backoff);
    }
  }

  // After retries: do not hard-fail the entire run; just return empty
  console.warn(`⚠️ ${label} failed after retries; continuing with empty`);
  return "";
}

async function getJsonWithRetry(url, label) {
  const text = await httpGetTextWithRetry(url, label);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Sometimes this endpoint returns valid JSON always; if parse fails, treat as null
    return null;
  }
}

async function validateGreenhouse(slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=false`;
  try {
    const res = await axios.get(url, { timeout: 15_000, validateStatus: () => true });
    return res.status === 200;
  } catch {
    return false;
  }
}
async function validateLever(slug) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  try {
    const res = await axios.get(url, { timeout: 15_000, validateStatus: () => true });
    return res.status === 200;
  } catch {
    return false;
  }
}
async function validateAshby(slug) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
  try {
    const res = await axios.get(url, { timeout: 15_000, validateStatus: () => true });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function cdxQuery(cdxApiBase, hostPrefix, page) {
  const url =
    `${cdxApiBase}?url=${encodeURIComponent(hostPrefix)}*` +
    `&output=json&fl=url,status&filter=status:200&collapse=urlkey&page=${page}`;

  const text = await httpGetTextWithRetry(url, `CDX ${hostPrefix} page=${page}`);
  if (!text) return [];
  return parseCdxJson(text);
}

async function discoverForHost({ name, hostPrefix, target, validateFn }) {
  console.log(`\n==============================`);
  console.log(`🔎 Discovering ${name} slugs from Common Crawl`);
  console.log(`Target: ${target}, Validate: ${VALIDATE}`);
  console.log(`Host prefix: ${hostPrefix}`);
  console.log(`==============================\n`);

  const collinfo = await getJsonWithRetry(
    "https://index.commoncrawl.org/collinfo.json",
    "collinfo.json"
  );

  if (!Array.isArray(collinfo) || collinfo.length === 0) {
    throw new Error("collinfo.json did not return a crawl list");
  }

  const sorted = [...collinfo]
    .filter((c) => c && c.id && c["cdx-api"])
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))
    .slice(0, LATEST_CRAWLS);

  const foundSet = new Set();
  const found = [];
  const validated = [];

  for (const crawl of sorted) {
    const cdxApi = crawl["cdx-api"];
    console.log(`🗂️ Using crawl: ${crawl.id}`);

    for (let page = 0; page < MAX_PAGES_PER_CRAWL; page++) {
      if (found.length >= target) break;

      // Always throttle to avoid 503
      await sleep(CDX_MIN_DELAY_MS);

      const rows = await cdxQuery(cdxApi, hostPrefix, page);
      if (!rows.length) break;

      for (const r of rows) {
        const url = r?.url || r?.[0] || null;
        const slug = extractSlugFromUrl(url);
        uniqPush(foundSet, found, slug);
        if (found.length >= target) break;
      }

      if (page % 5 === 0) console.log(`   page=${page} found=${found.length}/${target}`);
    }

    console.log(`✅ After ${crawl.id}: found=${found.length}/${target}`);
    if (found.length >= target) break;
  }

  console.log(`\n📌 Raw discovered ${name} slugs: ${found.length}`);

  if (VALIDATE) {
    console.log(`\n🧪 Validating ${name} slugs (throttled)…`);
    const BATCH = 30;
    for (let i = 0; i < found.length; i += BATCH) {
      const chunk = found.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(async (s) => (await validateFn(s)) ? s : null));
      for (const s of results) if (s) validated.push(s);

      if ((i / BATCH) % 10 === 0) {
        console.log(`   validated=${validated.length} / scanned=${Math.min(i + BATCH, found.length)}`);
      }

      await sleep(500);
      if (validated.length >= target) break;
    }
  }

  const final = VALIDATE ? validated.slice(0, target) : found.slice(0, target);
  console.log(`✅ Final ${name} count: ${final.length}`);
  return final;
}

async function run() {
  fs.mkdirSync(path.resolve(process.cwd(), OUT_DIR), { recursive: true });

  const greenhouseSlugs = await discoverForHost({
    name: "Greenhouse",
    hostPrefix: "boards.greenhouse.io/",
    target: TARGET_GREENHOUSE,
    validateFn: validateGreenhouse
  });

  const leverSlugs = await discoverForHost({
    name: "Lever",
    hostPrefix: "jobs.lever.co/",
    target: TARGET_LEVER,
    validateFn: validateLever
  });

  const ashbySlugs = await discoverForHost({
    name: "Ashby",
    hostPrefix: "jobs.ashbyhq.com/",
    target: TARGET_ASHBY,
    validateFn: validateAshby
  });

  const greenhouseMaster = greenhouseSlugs.map((s) => ({ name: s, greenhouse_company: s }));
  const leverMaster = leverSlugs.map((s) => ({ name: s, lever_company: s }));
  const ashbyMaster = ashbySlugs.map((s) => ({ name: s, ashby_company: s }));

  const outGreenhouse = path.join(OUT_DIR, "greenhouse-master.json");
  const outLever = path.join(OUT_DIR, "lever-master.json");
  const outAshby = path.join(OUT_DIR, "ashby-master.json");
  const outSummary = path.join(OUT_DIR, "discovery-summary.json");

  fs.writeFileSync(outGreenhouse, JSON.stringify(greenhouseMaster, null, 2));
  fs.writeFileSync(outLever, JSON.stringify(leverMaster, null, 2));
  fs.writeFileSync(outAshby, JSON.stringify(ashbyMaster, null, 2));

  const summary = {
    generated_at_utc: new Date().toISOString(),
    validate: VALIDATE,
    throttle: { cdx_min_delay_ms: CDX_MIN_DELAY_MS, cdx_max_retries: CDX_MAX_RETRIES },
    limits: { latest_crawls: LATEST_CRAWLS, max_pages_per_crawl: MAX_PAGES_PER_CRAWL },
    targets: { greenhouse: TARGET_GREENHOUSE, lever: TARGET_LEVER, ashby: TARGET_ASHBY },
    counts: { greenhouse: greenhouseMaster.length, lever: leverMaster.length, ashby: ashbyMaster.length }
  };
  fs.writeFileSync(outSummary, JSON.stringify(summary, null, 2));

  console.log("\n==============================");
  console.log("✅ Discovery complete");
  console.log("Greenhouse:", greenhouseMaster.length);
  console.log("Lever:", leverMaster.length);
  console.log("Ashby:", ashbyMaster.length);
  console.log("Wrote:", outGreenhouse);
  console.log("Wrote:", outLever);
  console.log("Wrote:", outAshby);
  console.log("Wrote:", outSummary);
  console.log("==============================\n");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
