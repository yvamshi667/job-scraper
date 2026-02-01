/**
 * Build a ~20,000-company master list from public listings data (ESM)
 *
 * Sources:
 *  1) SEC EDGAR: company_tickers_exchange.json  (ticker, cik, name, exchange)
 *     https://www.sec.gov/files/company_tickers_exchange.json  (public)  ([SEC](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data))
 *  2) Nasdaq Trader: nasdaqlisted.txt  (symbol + security name)
 *     https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt  (public)
 *
 * Output:
 *  - seeds/companies-master.json  (up to TARGET_COUNT)
 *
 * ENV:
 *  - TARGET_COUNT (default 20000)
 *  - OUT_FILE (default seeds/companies-master.json)
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const TARGET_COUNT = Number(process.env.TARGET_COUNT || 20000);
const OUT_FILE = process.env.OUT_FILE || "seeds/companies-master.json";

const SEC_TICKERS_EXCHANGE_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
const NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt";

// SEC asks for a descriptive User-Agent with contact. (Good practice to avoid 403/429)
const SEC_USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "job-scraper/1.0 (contact: you@example.com)";

function cleanCompanyName(name) {
  if (!name) return null;
  let s = String(name).trim();

  // Remove common suffix noise from security names
  s = s.replace(/\s+-\s+.*$/g, ""); // remove " - Common Stock" style tails
  s = s.replace(/\s+Class\s+[A-Z]\b.*$/i, "");
  s = s.replace(/\s+Common Stock\b.*$/i, "");
  s = s.replace(/\s+Ordinary Shares\b.*$/i, "");
  s = s.replace(/\s+American Depositary Shares\b.*$/i, "");
  s = s.replace(/\s+ADS\b.*$/i, "");
  s = s.replace(/\s+Warrants?\b.*$/i, "");
  s = s.replace(/\s+Units?\b.*$/i, "");
  s = s.replace(/\s+Preferred\b.*$/i, "");
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

async function fetchSecTickersExchange() {
  const res = await axios.get(SEC_TICKERS_EXCHANGE_URL, {
    timeout: 60_000,
    headers: {
      "User-Agent": SEC_USER_AGENT,
      Accept: "application/json",
    },
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    throw new Error(`SEC download failed: HTTP ${res.status}`);
  }

  const data = res.data;
  // SEC returns an object keyed by integer strings.
  // Each entry looks like: { cik, ticker, title, exchange }
  const out = [];

  for (const k of Object.keys(data)) {
    const row = data[k];
    const name = cleanCompanyName(row?.title);
    const ticker = row?.ticker ? String(row.ticker).trim() : null;
    const exchange = row?.exchange ? String(row.exchange).trim() : null;
    const cik = row?.cik ? String(row.cik).trim() : null;

    if (!name) continue;
    out.push({
      name,
      ticker,
      exchange,
      cik,
      source: "sec",
    });
  }

  return out;
}

function parseNasdaqListed(text) {
  // Pipe-delimited file with header line, then rows, then footer.
  // Example line:
  // AAPL|Apple Inc. - Common Stock|Q|N|N|100|N|N
  const lines = String(text).split("\n").map((l) => l.trim());
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
      exchange: "NASDAQ",
      cik: null,
      source: "nasdaqtrader",
    });
  }

  return out;
}

async function fetchNasdaqListed() {
  const res = await axios.get(NASDAQ_LISTED_URL, {
    timeout: 60_000,
    responseType: "text",
    validateStatus: () => true,
  });

  if (res.status !== 200) {
    throw new Error(`NasdaqTrader download failed: HTTP ${res.status}`);
  }

  return parseNasdaqListed(res.data);
}

function dedupeAndLimit(rows, limit) {
  const seen = new Set();
  const out = [];

  for (const r of rows) {
    const key = normalizeKey(r.name);
    if (!key) continue;
    // combine with ticker if present to reduce collisions
    const k2 = r.ticker ? `${key}::${r.ticker}` : key;

    if (seen.has(k2)) continue;
    seen.add(k2);
    out.push(r);

    if (out.length >= limit) break;
  }

  return out;
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Building companies-master.json from public sources");
  console.log("Target count:", TARGET_COUNT);
  console.log("SEC source:", SEC_TICKERS_EXCHANGE_URL);
  console.log("Nasdaq source:", NASDAQ_LISTED_URL);
  console.log("====================================================");

  const secRows = await fetchSecTickersExchange();
  console.log("✅ SEC rows:", secRows.length);

  const nasdaqRows = await fetchNasdaqListed();
  console.log("✅ NasdaqTrader rows:", nasdaqRows.length);

  // Combine: SEC tends to have the broadest, NasdaqTrader is a good supplement.
  // Put SEC first to prioritize cleaner EDGAR names.
  const combined = [...secRows, ...nasdaqRows];

  const finalRows = dedupeAndLimit(combined, TARGET_COUNT);
  console.log("✅ Final unique rows:", finalRows.length);

  // Write output
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
