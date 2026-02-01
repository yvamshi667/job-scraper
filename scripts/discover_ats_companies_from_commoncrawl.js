/**
 * Discover ATS company slugs from Common Crawl CDX index (ESM)
 *
 * Discovers:
 *  - Greenhouse: boards.greenhouse.io/<slug>/...
 *  - Lever: jobs.lever.co/<slug>/...
 *  - Ashby: jobs.ashbyhq.com/<slug>/...
 *
 * Uses Common Crawl's collinfo.json to pick latest crawls, then queries the CDX API.
 * Docs: https://commoncrawl.org/cdxj-index and collinfo.json listing.  (public)   [oai_citation:1‡commoncrawl.org](https://commoncrawl.org/cdxj-index)
 *
 * Output files:
 *  - seeds/greenhouse-master.json  [{ name, greenhouse_company }]
 *  - seeds/lever-master.json       [{ name, lever_company }]
 *  - seeds/ashby-master.json       [{ name, ashby_company }]
 *  - seeds/discovery-summary.json
 *
 * ENV (optional):
 *  - TARGET_GREENHOUSE (default 20000)
 *  - TARGET_LEVER (default 10000)
 *  - TARGET_ASHBY (default 5000)
 *  - LATEST_CRAWLS (default 5)          number of newest CC-MAIN indexes to query
 *  - MAX_PAGES_PER_CRAWL (default 50)   pagination limit per crawl (avoid overload)
 *  - VALIDATE (default true)            validate slugs against ATS APIs
 *  - OUT_DIR (default seeds)
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await axios.get(url, { timeout: 30_000 });
  return res.data;
}

// CDX API output=json often returns NDJSON (one JSON object per line) or JSON arrays.
// This parser handles both.
function parseCdxJson(textOrData) {
  if (Array.isArray(textOrData)) return textOrData;
  if (typeof textOrData === "object" && textOrData !== null) return textOrData;

  const raw = String(textOrData);
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

  // Some CDX responses include a header line like ["urlkey","timestamp","url",...]
  const out = [];
  for (const line of lines) {
    try {
      const v = JSON.parse(line);
      out.push(v);
    } catch {
      // ignore non-json line
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

// Validation helpers (fast HEAD/GET checks)
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
  // Example pattern from Common Crawl CDX usage:  https://index.commoncrawl.org/<crawl>-index?url=...&output=json   [oai_citation:2‡commoncrawl.org](https://commoncrawl.org/cdxj-index)
  const url =
    `${cdxApiBase}?url=${encodeURIComponent(hostPrefix)}*` +
    `&output=json&fl=url,status&filter=status:200&collapse=urlkey&page=${page}`;
  const res = await axios.get(url, { timeout: 30_000, responseType: "text" });
  return parseCdxJson(res.data);
}

async function discoverForHost({ name, hostPrefix, target, validateFn }) {
  console.log(`\n==============================`);
  console.log(`🔎 Discovering ${name} slugs from Common Crawl`);
  console.log(`Target: ${target}, Validate: ${VALIDATE}`);
  console.log(`Host prefix: ${hostPrefix}`);
  console.log(`==============================\n`);

  // Get list of crawls (CDX API base URLs live in collinfo.json)
  const collinfo = await getJson("https://index.commoncrawl.org/collinfo.json"); //  [oai_citation:3‡commoncrawl.org](https://commoncrawl.org/cdxj-index)
  if (!Array.isArray(collinfo) || collinfo.length === 0) {
    throw new Error("collinfo.json did not return a crawl list");
  }

  // Newest first (collinfo contains objects with "id" and "cdx-api")
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

      // Be nice to the service
      if (page > 0) await sleep(250);

      const rows = await cdxQuery(cdxApi, hostPrefix, page);
      if (!Array.isArray(rows) || rows.length === 0) {
        // no more results
        break;
      }

      for (const r of rows) {
        const url = r?.url || r?.[0] || null;
        const slug = extractSlugFromUrl(url);
        uniqPush(foundSet, found, slug);
        if (found.length >= target) break;
      }

      if (page % 5 === 0) {
        console.log(`   page=${page} found=${found.length}/${target}`);
      }
    }

    console.log(`✅ After ${crawl.id}: found=${found.length}/${target}`);
    if (found.length >= target) break;
  }

  console.log(`\n📌 Raw discovered ${name} slugs: ${found.length}`);

  if (VALIDATE) {
    console.log(`\n🧪 Validating ${name} slugs (this takes time)…`);
    // Validate in small batches to avoid rate limiting
    const BATCH = 50;
    for (let i = 0; i < found.length; i += BATCH) {
      const chunk = found.slice(i, i + BATCH);
      const results = await Promise.all(
        chunk.map(async (s) => {
          const ok = await validateFn(s);
          return ok ? s : null;
        })
      );
      for (const s of results) if (s) validated.push(s);

      if ((i / BATCH) % 10 === 0) {
        console.log(`   validated=${validated.length} / scanned=${Math.min(i + BATCH, found.length)}`);
      }

      // light throttle
      await sleep(300);
      // stop early if we already have enough validated
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
    latest_crawls_used: LATEST_CRAWLS,
    max_pages_per_crawl: MAX_PAGES_PER_CRAWL,
    validate: VALIDATE,
    targets: {
      greenhouse: TARGET_GREENHOUSE,
      lever: TARGET_LEVER,
      ashby: TARGET_ASHBY
    },
    counts: {
      greenhouse: greenhouseMaster.length,
      lever: leverMaster.length,
      ashby: ashbyMaster.length
    }
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
