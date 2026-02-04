import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || "";
const IN_FILE = process.env.IN_FILE || "seeds/us-orgs-100k-irs.json";
const OUT_FILE = process.env.OUT_FILE || "seeds/us-orgs-100k-enriched.json";

// Scan controls
const LIMIT = Number(process.env.LIMIT || 100000);

// Lookup controls
const MAX_LOOKUPS = Number(process.env.MAX_LOOKUPS || 20000); // cap per run
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const SLEEP_MS = Number(process.env.SLEEP_MS || 120);

// Cache (disk) so reruns do NOT repeat lookups
const CACHE_FILE = process.env.CACHE_FILE || "seeds/_cache_openalex_irs.json";

// Optional: stop once you have enough websites
const STOP_AT_ENRICHED = Number(process.env.STOP_AT_ENRICHED || 0); // 0 = disabled

if (!OPENALEX_API_KEY) {
  console.error("❌ Missing OPENALEX_API_KEY");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normName(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksTooGeneric(name) {
  const n = normName(name);
  if (!n) return true;

  // Very common org patterns that cause bad search results and slow you down
  const bad =
    n === "church" ||
    n === "foundation" ||
    n === "inc" ||
    n === "association" ||
    n === "ministry" ||
    n === "ministries" ||
    n === "school" ||
    n === "the" ||
    n.length < 5;

  if (bad) return true;

  // If name is like "First Baptist Church" etc. -> low hit rate
  const genericHints = [
    "baptist",
    "church",
    "ministries",
    "ministry",
    "temple",
    "synagogue",
    "mosque",
    "diocese",
    "parish",
    "pta",
    "parent teacher",
    "lodge",
    "fraternal",
    "vfw",
    "american legion",
  ];

  for (const h of genericHints) {
    if (n.includes(h)) return true;
  }
  return false;
}

function normalizeUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s) return null;
  if (s.startsWith("www.")) return "https://" + s;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return null;
}

function safeReadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function safeWriteJson(file, obj) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
}

// Basic retry/backoff wrapper
async function getWithRetry(url, { tries = 4, baseDelay = 500 } = {}) {
  let last = null;

  for (let i = 1; i <= tries; i++) {
    const res = await axios.get(url, {
      timeout: 60_000,
      validateStatus: () => true,
      headers: { "User-Agent": "job-scraper/1.0" },
    });

    if (res.status === 200) return res;

    last = res;

    // non-retriable
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
      return res;
    }

    // retriable: 429 / 5xx / timeouts etc.
    const delay = Math.min(15_000, baseDelay * i * i);
    await sleep(delay);
  }

  return last;
}

async function searchOpenAlexInstitutionByName(name) {
  // Institutions endpoint is stable; we only keep US + homepage_url
  const url =
    `https://api.openalex.org/institutions` +
    `?search=${encodeURIComponent(name)}` +
    `&per-page=5` +
    `&select=display_name,homepage_url,country_code` +
    `&api_key=${encodeURIComponent(OPENALEX_API_KEY)}`;

  const res = await getWithRetry(url);
  if (!res || res.status !== 200) return null;

  const results = Array.isArray(res.data?.results) ? res.data.results : [];
  const target = normName(name);

  let best = null;

  for (const r of results) {
    if ((r?.country_code || "").toUpperCase() !== "US") continue;
    const cand = normName(r?.display_name);
    if (!cand) continue;

    // scoring: exact > contains
    const score =
      (cand === target ? 100 : 0) +
      (cand.includes(target) ? 15 : 0) +
      (target.includes(cand) ? 7 : 0);

    if (!best || score > best.score) best = { score, r };
  }

  if (!best) return null;

  const website = normalizeUrl(best.r?.homepage_url);
  if (!website) return null;

  return website;
}

// simple concurrency pool
async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let idx = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) break;
      out[i] = await fn(items[i], i);
    }
  });

  await Promise.all(workers);
  return out;
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Enrich IRS orgs with website using OpenAlex");
  console.log("Input:", IN_FILE);
  console.log("Output:", OUT_FILE);
  console.log("Cache:", CACHE_FILE);
  console.log("LIMIT:", LIMIT);
  console.log("MAX_LOOKUPS:", MAX_LOOKUPS);
  console.log("CONCURRENCY:", CONCURRENCY);
  console.log("SLEEP_MS:", SLEEP_MS);
  console.log("STOP_AT_ENRICHED:", STOP_AT_ENRICHED || "(disabled)");
  console.log("====================================================");

  const raw = fs.readFileSync(path.resolve(IN_FILE), "utf8");
  const list = JSON.parse(raw);

  const cache = safeReadJson(CACHE_FILE, {
    // key: normalized name -> website|null
    byName: {},
    stats: { hits: 0, misses: 0, savedAt: new Date().toISOString() },
  });

  let lookups = 0;
  let enriched = 0;
  let processed = 0;

  const slice = list.slice(0, Math.min(list.length, LIMIT));

  // We enrich in chunks so we can print progress + stop early if needed
  const CHUNK = 500;

  const outAll = [];

  for (let start = 0; start < slice.length; start += CHUNK) {
    const chunk = slice.slice(start, start + CHUNK);

    // stop early if requested
    if (STOP_AT_ENRICHED > 0 && enriched >= STOP_AT_ENRICHED) {
      // pass-through rest without lookups
      for (const item of chunk) outAll.push({ ...item, website: item.website ?? null });
      continue;
    }

    const enrichedChunk = await mapPool(chunk, CONCURRENCY, async (item) => {
      const name = item?.name;
      processed++;

      if (!name) return { ...item, website: null };

      const key = normName(name);
      if (!key || looksTooGeneric(name)) {
        return { ...item, website: null };
      }

      // cache hit
      if (Object.prototype.hasOwnProperty.call(cache.byName, key)) {
        cache.stats.hits++;
        const website = cache.byName[key];
        if (website) enriched++;
        return { ...item, website: website || null };
      }

      // cache miss
      cache.stats.misses++;

      // respect MAX_LOOKUPS
      if (lookups >= MAX_LOOKUPS) {
        cache.byName[key] = null;
        return { ...item, website: null };
      }

      lookups++;

      const website = await searchOpenAlexInstitutionByName(name);
      cache.byName[key] = website || null;
      if (website) enriched++;

      // small pacing to reduce 429 risk (per worker)
      if (SLEEP_MS > 0) await sleep(SLEEP_MS);

      return { ...item, website: website || null };
    });

    outAll.push(...enrichedChunk);

    if (processed % 1000 === 0 || start + CHUNK >= slice.length) {
      console.log(`✅ processed=${processed} lookups=${lookups} enriched=${enriched} cacheHits=${cache.stats.hits}`);
      safeWriteJson(CACHE_FILE, {
        ...cache,
        stats: { ...cache.stats, savedAt: new Date().toISOString() },
      });
    }
  }

  fs.mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(outAll, null, 2), "utf8");

  safeWriteJson(CACHE_FILE, {
    ...cache,
    stats: { ...cache.stats, savedAt: new Date().toISOString() },
  });

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Processed:", outAll.length);
  console.log("Lookups:", lookups);
  console.log("Enriched with website:", enriched);
  console.log("Wrote:", OUT_FILE);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
