import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const IN_FILE = process.env.IN_FILE || "seeds/us-orgs-100k-enriched.json";
const OUT_DIR = process.env.OUT_DIR || "seeds";

const LIMIT = Number(process.env.LIMIT || 100000);
const MAX_CHECKS = Number(process.env.MAX_CHECKS || 20000);

// parallelism
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);

// pacing + retry
const SLEEP_MS = Number(process.env.SLEEP_MS || 120);
const MAX_PAGES_PER_ORG = Number(process.env.MAX_PAGES_PER_ORG || 6);
const RETRIES = Number(process.env.RETRIES || 3);

// cache checked domains to avoid repeating work across runs
const CACHE_FILE = process.env.CACHE_FILE || "seeds/_cache_ats_detect.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function extractDomain(url) {
  try {
    if (!url) return null;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeUrl(u) {
  try {
    if (!u) return null;
    const url = new URL(u);
    return url.toString();
  } catch {
    return null;
  }
}

function absUrl(base, maybeRelative) {
  try {
    if (!maybeRelative) return null;
    const b = new URL(base);
    return new URL(maybeRelative, b).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 25_000,
        validateStatus: () => true,
        headers: { "User-Agent": "job-scraper/1.0" },
      });

      // 2xx/3xx ok
      if (res.status >= 200 && res.status < 400) {
        const html = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
        return { ok: true, status: res.status, html };
      }

      // 404 etc: non fatal, just no page
      if (res.status === 404 || res.status === 403) {
        return { ok: false, status: res.status, html: "" };
      }

      // retriable statuses
      if (res.status === 429 || res.status >= 500) {
        const backoff = Math.min(10_000, 400 * attempt * attempt);
        await sleep(backoff);
        continue;
      }

      return { ok: false, status: res.status, html: "" };
    } catch {
      const backoff = Math.min(10_000, 400 * attempt * attempt);
      await sleep(backoff);
    }
  }
  return { ok: false, status: 0, html: "" };
}

function detectAtsFromHtml(html) {
  const h = (html || "").toLowerCase();

  if (h.includes("boards.greenhouse.io") || h.includes("greenhouse.io/embed/job_board"))
    return "greenhouse";
  if (h.includes("jobs.lever.co") || h.includes("api.lever.co")) return "lever";
  if (h.includes("jobs.ashbyhq.com") || h.includes("ashbyhq.com")) return "ashby";
  if (h.includes("myworkdayjobs.com")) return "workday";

  return null;
}

function extractSlugFromHtml(html, atsType) {
  const s = html || "";

  // Greenhouse patterns:
  // 1) https://boards.greenhouse.io/<slug>
  // 2) https://boards.greenhouse.io/<slug>/jobs/123
  // 3) https://boards.greenhouse.io/embed/job_app?for=<slug>&token=...
  // 4) https://www.greenhouse.io/embed/job_board/js?for=<slug>
  if (atsType === "greenhouse") {
    const m1 = s.match(/https?:\/\/boards\.greenhouse\.io\/([a-z0-9\-_]+)/i);
    if (m1?.[1]) return m1[1];

    const m2 = s.match(/greenhouse\.io\/embed\/job_board\/js\?for=([a-z0-9\-_]+)/i);
    if (m2?.[1]) return m2[1];

    const m3 = s.match(/greenhouse\.io\/embed\/job_app\?for=([a-z0-9\-_]+)/i);
    if (m3?.[1]) return m3[1];

    const m4 = s.match(/greenhouse\.io\/embed\/job_board\/js\?for=([a-z0-9\-_]+)/i);
    if (m4?.[1]) return m4[1];

    return null;
  }

  if (atsType === "lever") {
    const m = s.match(/https?:\/\/jobs\.lever\.co\/([a-z0-9\-_]+)/i);
    return m?.[1] || null;
  }

  if (atsType === "ashby") {
    const m = s.match(/https?:\/\/jobs\.ashbyhq\.com\/([a-z0-9\-_]+)/i);
    return m?.[1] || null;
  }

  return null;
}

function findCareersLinks(html, baseUrl) {
  const out = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;

  let m;
  while ((m = re.exec(html || ""))) {
    const href = m[1];
    if (!href) continue;
    const low = href.toLowerCase();

    // links likely to lead to job pages
    if (
      low.includes("careers") ||
      low.includes("/jobs") ||
      low.includes("job-openings") ||
      low.includes("join-us") ||
      low.includes("work-with-us") ||
      low.includes("open-roles") ||
      low.includes("opportunities")
    ) {
      const full = absUrl(baseUrl, href);
      if (full) out.add(full);
    }

    // direct ATS links are best
    if (low.includes("boards.greenhouse.io") || low.includes("jobs.lever.co") || low.includes("jobs.ashbyhq.com")) {
      const full = absUrl(baseUrl, href);
      if (full) out.add(full);
    }

    if (out.size >= 15) break;
  }

  return Array.from(out);
}

function buildCandidateUrls(site) {
  const base = site.replace(/\/$/, "");
  const domain = extractDomain(base);
  const candidates = [];

  // homepage first
  candidates.push(base);

  // common paths
  candidates.push(`${base}/careers`);
  candidates.push(`${base}/jobs`);
  candidates.push(`${base}/careers/jobs`);
  candidates.push(`${base}/about/careers`);
  candidates.push(`${base}/company/careers`);
  candidates.push(`${base}/work-with-us`);
  candidates.push(`${base}/join-us`);
  candidates.push(`${base}/open-roles`);

  // common subdomains
  if (domain) {
    candidates.push(`https://careers.${domain}`);
    candidates.push(`https://jobs.${domain}`);
  }

  // dedupe
  return Array.from(new Set(candidates));
}

async function detectAtsForOrg(website) {
  const site = normalizeUrl(website);
  if (!site) return { type: "unknown", slug: null, careers_url: null };

  const candidates = buildCandidateUrls(site).slice(0, MAX_PAGES_PER_ORG);

  for (const url of candidates) {
    const { ok, html } = await fetchHtml(url);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    if (!ok) continue;

    const ats = detectAtsFromHtml(html);
    if (ats) {
      const slug = extractSlugFromHtml(html, ats);
      return { type: ats, slug: slug || null, careers_url: url };
    }

    // If no ATS visible, crawl likely links from this page
    const links = findCareersLinks(html, url).slice(0, MAX_PAGES_PER_ORG);
    for (const link of links) {
      const r = await fetchHtml(link);
      if (SLEEP_MS > 0) await sleep(SLEEP_MS);
      if (!r.ok) continue;

      const ats2 = detectAtsFromHtml(r.html);
      if (ats2) {
        const slug2 = extractSlugFromHtml(r.html, ats2);
        return { type: ats2, slug: slug2 || null, careers_url: link };
      }
    }
  }

  return { type: "unknown", slug: null, careers_url: null };
}

// concurrency pool
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
  console.log("🚀 Build ATS seeds from enriched orgs (improved detection)");
  console.log("Input:", IN_FILE);
  console.log("Output dir:", OUT_DIR);
  console.log("MAX_CHECKS:", MAX_CHECKS);
  console.log("CONCURRENCY:", CONCURRENCY);
  console.log("MAX_PAGES_PER_ORG:", MAX_PAGES_PER_ORG);
  console.log("CACHE:", CACHE_FILE);
  console.log("====================================================");

  const list = JSON.parse(fs.readFileSync(path.resolve(IN_FILE), "utf8")).slice(0, LIMIT);

  const cache = safeReadJson(CACHE_FILE, {
    // domain -> { type, slug, careers_url } (including unknown)
    byDomain: {},
    stats: { hits: 0, misses: 0, savedAt: new Date().toISOString() },
  });

  const greenhouse = [];
  const lever = [];
  const ashby = [];
  const workday = [];
  const unknown = [];

  // only items with websites
  const items = [];
  for (const item of list) {
    if (!item?.website) continue;
    items.push(item);
    if (items.length >= MAX_CHECKS) break;
  }

  let checked = 0;

  const results = await mapPool(items, CONCURRENCY, async (item) => {
    const website = item.website;
    const domain = extractDomain(website);
    if (!domain) return { item, ats: { type: "unknown", slug: null, careers_url: null } };

    checked++;

    // cache hit
    if (Object.prototype.hasOwnProperty.call(cache.byDomain, domain)) {
      cache.stats.hits++;
      return { item, ats: cache.byDomain[domain] };
    }

    cache.stats.misses++;

    const ats = await detectAtsForOrg(website);
    cache.byDomain[domain] = ats;

    // periodically persist cache
    if (checked % 200 === 0) {
      safeWriteJson(CACHE_FILE, {
        ...cache,
        stats: { ...cache.stats, savedAt: new Date().toISOString() },
      });
      console.log(
        `✅ checked=${checked} cacheHits=${cache.stats.hits} cacheMisses=${cache.stats.misses} GH=${greenhouse.length} Lever=${lever.length} Ashby=${ashby.length} WD=${workday.length} Unknown=${unknown.length}`
      );
    }

    return { item, ats };
  });

  for (const { item, ats } of results) {
    if (ats.type === "greenhouse" && ats.slug) greenhouse.push({ name: item.name, greenhouse_company: ats.slug });
    else if (ats.type === "lever" && ats.slug) lever.push({ name: item.name, lever_company: ats.slug });
    else if (ats.type === "ashby" && ats.slug) ashby.push({ name: item.name, ashby_company: ats.slug });
    else if (ats.type === "workday") workday.push({ name: item.name, website: item.website });
    else unknown.push({ name: item.name, website: item.website, careers_url: ats.careers_url });
  }

  fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "greenhouse-master.json"), JSON.stringify(greenhouse, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "lever-master.json"), JSON.stringify(lever, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "ashby-master.json"), JSON.stringify(ashby, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "workday-master.json"), JSON.stringify(workday, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "unknown-master.json"), JSON.stringify(unknown, null, 2));

  safeWriteJson(CACHE_FILE, {
    ...cache,
    stats: { ...cache.stats, savedAt: new Date().toISOString() },
  });

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Checked:", results.length);
  console.log("Greenhouse:", greenhouse.length);
  console.log("Lever:", lever.length);
  console.log("Ashby:", ashby.length);
  console.log("Workday:", workday.length);
  console.log("Unknown:", unknown.length);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
