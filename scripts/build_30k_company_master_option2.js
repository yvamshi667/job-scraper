/**
 * Build a ~30,000 company master list (public + startup + enterprise) (ESM)
 *
 * Sources:
 *  - NasdaqTrader NASDAQ listed: https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt  ([NasdaqTrader] turn0search4)
 *  - NasdaqTrader other listed:  https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt   ([NasdaqTrader] turn0search0)
 *  - Fortune1000 CSV (raw GitHub): https://raw.githubusercontent.com/dmarcelinobr/Datasets/master/Fortune1000.csv ([GitHub raw] turn1search8)
 *  - Tech companies/startups CSV: https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/companies.csv ([GitHub repo] turn3search1)
 *  - YC companies API: https://yc-oss.github.io/api/companies/all.json ([YC API] turn2view0)
 *
 * Output:
 *  - seeds/companies-master.json
 *
 * ENV:
 *  - TARGET_COUNT (default 30000)
 *  - OUT_FILE (default seeds/companies-master.json)
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const TARGET_COUNT = Number(process.env.TARGET_COUNT || 30000);
const OUT_FILE = process.env.OUT_FILE || "seeds/companies-master.json";

const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";
const OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt";

const FORTUNE1000_URL = "https://raw.githubusercontent.com/dmarcelinobr/Datasets/master/Fortune1000.csv";
const TECH_COMPANIES_URL = "https://raw.githubusercontent.com/connor11528/tech-companies-and-startups/master/companies.csv";

const YC_ALL_URL = "https://yc-oss.github.io/api/companies/all.json";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- CSV parsing (simple + robust) ----------
function parseCsvLine(line) {
  // Basic CSV parser supporting quoted fields with commas.
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' ) {
      // double quote escape
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { header: [], rows: [] };

  const header = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    // pad
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

  // Strip common tails
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
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeUrl(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s) return null;
  if (s.startsWith("www.")) s = "https://" + s;
  if (!s.startsWith("http://") && !s.startsWith("https://")) {
    // If it's a domain only
    if (s.includes(".") && !s.includes("/")) s = "https://" + s;
  }
  return s;
}

function extractDomain(u) {
  try {
    if (!u) return null;
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

// ---------- NasdaqTrader parsers ----------
function parseNasdaqSymDir(text, exchangeName) {
  // Pipe-delimited, header line then rows then footer.
  // Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
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

// ---------- Fetch helpers ----------
async function fetchText(url, label) {
  const res = await axios.get(url, {
    timeout: 60_000,
    responseType: "text",
    validateStatus: () => true
  });
  if (res.status !== 200) throw new Error(`${label} HTTP ${res.status}`);
  return res.data;
}

async function fetchJson(url, label) {
  const res = await axios.get(url, {
    timeout: 60_000,
    validateStatus: () => true
  });
  if (res.status !== 200) throw new Error(`${label} HTTP ${res.status}`);
  return res.data;
}

// ---------- Source loaders ----------
async function loadNasdaqTrader() {
  const nasdaqTxt = await fetchText(NASDAQ_LISTED_URL, "nasdaqlisted.txt");
  const otherTxt = await fetchText(OTHER_LISTED_URL, "otherlisted.txt");

  const nasdaq = parseNasdaqSymDir(nasdaqTxt, "NASDAQ");
  const other = parseNasdaqSymDir(otherTxt, "OTHER");

  return [...nasdaq, ...other];
}

async function loadFortune1000() {
  const csvText = await fetchText(FORTUNE1000_URL, "Fortune1000.csv");
  const { rows } = parseCsv(csvText);

  // This dataset has "Company" and "Website" columns (from the raw file preview)
  const out = [];
  for (const r of rows) {
    const name = cleanCompanyName(r.Company || r.company || r.Name || r.name);
    if (!name) continue;

    const website = normalizeUrl(r.Website || r.website || r.URL || r.url);
    const domain = extractDomain(website);

    out.push({
      name,
      ticker: null,
      exchange: null,
      website,
      domain,
      source: "fortune1000"
    });
  }
  return out;
}

async function loadTechCompaniesCsv() {
  const csvText = await fetchText(TECH_COMPANIES_URL, "tech-companies companies.csv");
  const { rows } = parseCsv(csvText);

  // This CSV may have columns like name, website, domain, etc. We'll check common keys.
  const out = [];
  for (const r of rows) {
    const name = cleanCompanyName(
      r.name || r.Name || r.company || r.Company || r.company_name || r.CompanyName
    );
    if (!name) continue;

    const website = normalizeUrl(r.website || r.Website || r.url || r.URL || r.homepage);
    const domain = extractDomain(website) || (r.domain ? String(r.domain).trim().toLowerCase() : null);

    out.push({
      name,
      ticker: null,
      exchange: null,
      website,
      domain,
      source: "tech-companies-and-startups"
    });
  }
  return out;
}

async function loadYcCompanies() {
  const data = await fetchJson(YC_ALL_URL, "yc all.json");

  // YC API returns array of company objects with fields: name, website, etc.
  const out = [];
  if (!Array.isArray(data)) return out;

  for (const c of data) {
    const name = cleanCompanyName(c?.name);
    if (!name) continue;

    const website = normalizeUrl(c?.website);
    const domain = extractDomain(website);

    out.push({
      name,
      ticker: null,
      exchange: null,
      website,
      domain,
      source: "yc-oss"
    });
  }
  return out;
}

// ---------- Merge strategy ----------
function scoreRow(r) {
  // prefer rows with domain/website, then with ticker/exchange
  let s = 0;
  if (r.domain) s += 5;
  if (r.website) s += 3;
  if (r.ticker) s += 2;
  if (r.exchange) s += 1;
  // Fortune and YC are usually cleaner than generic lists
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
      // choose better record (more fields)
      const a = scoreRow(existing);
      const b = scoreRow(r);
      if (b > a) byKey.set(key, r);
      else {
        // fill missing fields
        existing.website ||= r.website || null;
        existing.domain ||= r.domain || null;
        existing.ticker ||= r.ticker || null;
        existing.exchange ||= r.exchange || null;
      }
    }
  }

  const merged = Array.from(byKey.values());

  // Sort: prefer richer records first
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

  // Avoid hammering GitHub raw too fast
  await sleep(400);

  console.log("📥 Fetching Fortune1000…");
  const fortune = await loadFortune1000();
  console.log("✅ Fortune rows:", fortune.length);
  all.push(...fortune);

  await sleep(400);

  console.log("📥 Fetching Tech companies/startups…");
  const tech = await loadTechCompaniesCsv();
  console.log("✅ Tech rows:", tech.length);
  all.push(...tech);

  await sleep(400);

  console.log("📥 Fetching YC companies…");
  const yc = await loadYcCompanies();
  console.log("✅ YC rows:", yc.length);
  all.push(...yc);

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
