import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const TARGET_COUNT = Number(process.env.TARGET_COUNT || 30000);
const OUT_FILE = process.env.OUT_FILE || "seeds/companies-master.json";

const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";

const FORTUNE1000_URL = "https://raw.githubusercontent.com/dmarcelinobr/Datasets/master/Fortune1000.csv";
const YC_ALL_URL = "https://yc-oss.github.io/api/companies/all.json";

const STARTUP_CSV_URLS = [
  "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/companies.csv",
  "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/silicon-valley-companies.csv",
  "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/san-francisco-tech-companies-06-30-2021.csv",
  "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/tech-companies-in-oakland-06-20-2021.csv",
  "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/y-combinator-companies.csv",
  "https://raw.githubusercontent.com/ali-ce/datasets/master/Y-Combinator/Startups.csv"
];

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || "";
const OPENALEX_PAGES = Number(process.env.OPENALEX_PAGES || 120);
const OPENALEX_PER_PAGE = Math.min(200, Number(process.env.OPENALEX_PER_PAGE || 200));

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ---------- robust fetch ----------
async function fetchTextSafe(url, label) {
  const UA = "job-scraper/1.0 (+https://github.com/)";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 60_000,
        responseType: "text",
        headers: { "User-Agent": UA },
        validateStatus: () => true
      });
      if (res.status !== 200) {
        const backoff = Math.min(10_000, 500 * attempt * attempt);
        console.warn(`⚠️ ${label} HTTP ${res.status} attempt ${attempt}/6 backoff=${backoff}ms`);
        await sleep(backoff);
        continue;
      }
      return String(res.data || "");
    } catch (e) {
      const backoff = Math.min(10_000, 700 * attempt * attempt);
      console.warn(`⚠️ ${label} error attempt ${attempt}/6 msg=${e?.message || e} backoff=${backoff}ms`);
      await sleep(backoff);
    }
  }
  console.warn(`⚠️ ${label} failed after retries (skipping)`);
  return "";
}

async function fetchJsonSafe(url, label) {
  const UA = "job-scraper/1.0 (+https://github.com/)";
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout: 60_000,
        headers: { "User-Agent": UA, Accept: "application/json" },
        validateStatus: () => true
      });

      if (res.status === 200) return res.data;

      const retriable = [429, 500, 502, 503, 504, 520, 522, 523, 524];
      if (!retriable.includes(res.status)) {
        console.warn(`⚠️ ${label} HTTP ${res.status} non-retriable -> skip`);
        return null;
      }

      const backoff = Math.min(10_000, 600 * attempt * attempt);
      console.warn(`⚠️ ${label} HTTP ${res.status} attempt ${attempt}/6 backoff=${backoff}ms`);
      await sleep(backoff);
    } catch (e) {
      const backoff = Math.min(10_000, 700 * attempt * attempt);
      console.warn(`⚠️ ${label} error attempt ${attempt}/6 msg=${e?.message || e} backoff=${backoff}ms`);
      await sleep(backoff);
    }
  }
  console.warn(`⚠️ ${label} failed after retries (skipping)`);
  return null;
}

// ---------- CSV parsing ----------
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    while (cols.length < header.length) cols.push("");
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

// ---------- Normalizers ----------
function cleanCompanyName(name) {
  if (!name) return null;
  let s = String(name).trim();
  s = s.replace(/\s+-\s+.*$/g, "");
  s = s.replace(/\s+Common Stock\b.*$/i, "");
  s = s.replace(/\s+Ordinary Shares\b.*$/i, "");
  s = s.replace(/\s+American Depositary Shares\b.*$/i, "");
  s = s.replace(/\s+Depositary Shares\b.*$/i, "");
  s = s.replace(/\s+Warrants?\b.*$/i, "");
  s = s.replace(/\s+Units?\b.*$/i, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length < 2) return null;
  if (s.length > 200) s = s.slice(0, 200);
  return s;
}

function normalizeKey(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("www.")) s = "https://" + s;
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    if (s.includes(".") && !s.includes("/")) s = "https://" + s;
  }
  return s;
}

function extractDomain(u) {
  try {
    if (!u) return null;
    const url = new URL(u);
    return url.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

// ---------- Nasdaq parsing ----------
function parseNasdaqSymDir(text, exchangeName) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim());
  const out = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("Symbol|")) continue;
    if (line.startsWith("File Creation Time")) break;

    const parts = line.split("|");
    const symbol = parts[0]?.trim();
    const securityName = parts[1]?.trim();
    if (!symbol || !securityName) continue;

    const name = cleanCompanyName(securityName);
    if (!name) continue;

    out.push({
      name,
      ticker: symbol,
      exchange: exchangeName,
      website: null,
      domain: null,
      source: exchangeName === "NASDAQ" ? "nasdaqtrader:nasdaqlisted" : "nasdaqtrader:otherlisted"
    });
  }
  return out;
}

async function loadNasdaqTrader() {
  const nasdaqTxt = await fetchTextSafe(NASDAQ_LISTED_URL, "nasdaqlisted.txt");
  const otherTxt = await fetchTextSafe(OTHER_LISTED_URL, "otherlisted.txt");
  return [...parseNasdaqSymDir(nasdaqTxt, "NASDAQ"), ...parseNasdaqSymDir(otherTxt, "OTHER")];
}

async function loadFortune1000() {
  const csvText = await fetchTextSafe(FORTUNE1000_URL, "Fortune1000.csv");
  const { rows } = parseCsv(csvText);
  const out = [];
  for (const r of rows) {
    const name = cleanCompanyName(r.Company || r.company || r.Name || r.name);
    if (!name) continue;
    const website = normalizeUrl(r.Website || r.website || r.URL || r.url);
    const domain = extractDomain(website);
    out.push({ name, ticker: null, exchange: null, website, domain, source: "fortune1000" });
  }
  return out;
}

async function loadStartupCsvs() {
  const out = [];
  let totalRows = 0;

  for (const url of STARTUP_CSV_URLS) {
    const label = `startup-csv ${url.split("/").slice(-2).join("/")}`;
    const csvText = await fetchTextSafe(url, label);
    if (!csvText) continue;

    const lines = csvText.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2 || !lines[0].includes(",")) continue;

    const { rows } = parseCsv(csvText);
    totalRows += rows.length;

    for (const r of rows) {
      const name = cleanCompanyName(
        r.name || r.Name || r.company || r.Company || r.company_name || r.CompanyName || r["Company Name"]
      );
      if (!name) continue;

      const website = normalizeUrl(r.website || r.Website || r.url || r.URL || r.homepage || r.domain);
      const domain = extractDomain(website) || (r.domain ? String(r.domain).trim().toLowerCase() : null);

      out.push({ name, ticker: null, exchange: null, website, domain, source: "startup-datasets" });
    }
    await sleep(150);
  }

  console.log("✅ Startup CSV raw rows parsed:", totalRows);
  return out;
}

async function loadYcCompanies() {
  const data = await fetchJsonSafe(YC_ALL_URL, "yc-oss all.json");
  const out = [];
  if (!Array.isArray(data)) return out;

  for (const c of data) {
    const name = cleanCompanyName(c?.name);
    if (!name) continue;
    const website = normalizeUrl(c?.website);
    const domain = extractDomain(website);
    out.push({ name, ticker: null, exchange: null, website, domain, source: "yc-oss" });
  }
  return out;
}

// ✅ Dedicated OpenAlex fetch that prints debug (without leaking key)
async function fetchOpenAlexPage(cursor, batchNum) {
  const base = "https://api.openalex.org/organizations";
  const params =
    `?per-page=${OPENALEX_PER_PAGE}` +
    `&cursor=${encodeURIComponent(cursor)}` +
    `&select=display_name,homepage_url` +
    (OPENALEX_API_KEY ? `&api_key=${encodeURIComponent(OPENALEX_API_KEY)}` : "");

  const url = base + params;

  // Safe URL for logs (mask key)
  const safeUrl = OPENALEX_API_KEY ? url.replace(encodeURIComponent(OPENALEX_API_KEY), "***") : url;
  if (batchNum === 1) console.log("🔎 OpenAlex request (masked):", safeUrl);

  const res = await axios.get(url, {
    timeout: 60_000,
    headers: { Accept: "application/json" },
    validateStatus: () => true
  });

  if (res.status !== 200) {
    const body = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    console.warn(`⚠️ OpenAlex HTTP ${res.status} on batch ${batchNum}`);
    console.warn("⚠️ OpenAlex response (first 300 chars):", body.slice(0, 300));
    return null;
  }

  return res.data;
}

async function loadOpenAlexOrgs() {
  console.log("🔗 OpenAlex using cursor pagination");

  // If key is missing, still try once to show if endpoint works unauthenticated
  let cursor = "*";
  const out = [];
  let scanned = 0;

  for (let batch = 1; batch <= OPENALEX_PAGES; batch++) {
    const data = await fetchOpenAlexPage(cursor, batch);
    if (!data || !Array.isArray(data.results)) break;

    for (const r of data.results) {
      const name = cleanCompanyName(r?.display_name);
      if (!name) continue;
      const website = normalizeUrl(r?.homepage_url);
      const domain = extractDomain(website);
      if (!domain) continue;
      out.push({ name, ticker: null, exchange: null, website, domain, source: "openalex" });
    }

    scanned += data.results.length;
    console.log(`✅ OpenAlex batch ${batch}: fetched=${data.results.length}, keptTotal=${out.length}`);

    const next = data?.meta?.next_cursor;
    if (!next) break;
    cursor = next;

    if (out.length >= 70000) break;
    await sleep(250);
  }

  console.log("✅ OpenAlex scanned:", scanned, "kept:", out.length);
  return out;
}

function scoreRow(r) {
  let s = 0;
  if (r.domain) s += 5;
  if (r.website) s += 3;
  if (r.ticker) s += 2;
  if (r.exchange) s += 1;
  if (r.source === "fortune1000") s += 2;
  if (r.source === "yc-oss") s += 2;
  return s;
}

function mergeAndDedupe(allRows, limit) {
  const byKey = new Map();

  for (const r of allRows) {
    const key = normalizeKey(r.name);
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, r);
    } else {
      const a = scoreRow(existing);
      const b = scoreRow(r);
      if (b > a) {
        r.website ||= existing.website || null;
        r.domain ||= existing.domain || null;
        r.ticker ||= existing.ticker || null;
        r.exchange ||= existing.exchange || null;
        byKey.set(key, r);
      } else {
        existing.website ||= r.website || null;
        existing.domain ||= r.domain || null;
        existing.ticker ||= r.ticker || null;
        existing.exchange ||= r.exchange || null;
      }
    }
  }

  const merged = Array.from(byKey.values());
  merged.sort((x, y) => scoreRow(y) - scoreRow(x));
  return merged.slice(0, limit);
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Building companies-master.json (Option 2: public + startup + enterprise)");
  console.log("Target count:", TARGET_COUNT);
  console.log("====================================================");

  const all = [];

  console.log("📥 Fetching NasdaqTrader listings…");
  const listings = await loadNasdaqTrader();
  console.log("✅ NasdaqTrader rows:", listings.length);
  all.push(...listings);

  await sleep(300);

  console.log("📥 Fetching Fortune1000…");
  const fortune = await loadFortune1000();
  console.log("✅ Fortune rows:", fortune.length);
  all.push(...fortune);

  await sleep(300);

  console.log("📥 Fetching Startup CSV datasets (multiple)…");
  const startups = await loadStartupCsvs();
  console.log("✅ Startup rows:", startups.length);
  all.push(...startups);

  await sleep(300);

  console.log("📥 Fetching YC companies…");
  const yc = await loadYcCompanies();
  console.log("✅ YC rows:", yc.length);
  all.push(...yc);

  await sleep(300);

  console.log("📥 Fetching OpenAlex organizations (mass boost)…");
  const oa = await loadOpenAlexOrgs();
  console.log("✅ OpenAlex rows:", oa.length);
  all.push(...oa);

  console.log("🧩 Merging + deduping…");
  const finalRows = mergeAndDedupe(all, TARGET_COUNT);

  console.log("✅ Final unique rows:", finalRows.length);

  const outPath = path.resolve(process.cwd(), OUT_FILE);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(finalRows, null, 2), "utf8");

  console.log("✅ Wrote:", OUT_FILE);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
