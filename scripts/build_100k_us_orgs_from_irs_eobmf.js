/**
 * Build 100,000 US organizations from IRS EO BMF (Exempt Organizations Business Master File Extract)
 *
 * Source: IRS EO BMF CSV files by state/region (public).  [oai_citation:1‡IRS](https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf)
 * Example region files:
 *  - https://www.irs.gov/pub/irs-soi/eo1.csv
 *  - https://www.irs.gov/pub/irs-soi/eo2.csv
 *  - https://www.irs.gov/pub/irs-soi/eo3.csv
 *  - https://www.irs.gov/pub/irs-soi/eo4.csv
 *
 * We download region CSVs in order until we reach TARGET_COUNT.
 *
 * ENV:
 *  - TARGET_COUNT (default 100000)
 *  - OUT_JSON (default seeds/us-orgs-100k-irs.json)
 *  - OUT_CSV  (default seeds/us-orgs-100k-irs.csv)
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import readline from "node:readline";

const TARGET_COUNT = Number(process.env.TARGET_COUNT || 100000);
const OUT_JSON = process.env.OUT_JSON || "seeds/us-orgs-100k-irs.json";
const OUT_CSV = process.env.OUT_CSV || "seeds/us-orgs-100k-irs.csv";

// Try regions first (big files). All are US-focused; EO BMF page lists regions.  [oai_citation:2‡IRS](https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf)
const REGION_URLS = [
  "https://www.irs.gov/pub/irs-soi/eo2.csv", // Mid-Atlantic & Great Lakes
  "https://www.irs.gov/pub/irs-soi/eo3.csv", // Gulf Coast & Pacific Coast
  "https://www.irs.gov/pub/irs-soi/eo1.csv", // Northeast
  "https://www.irs.gov/pub/irs-soi/eo4.csv"  // All other areas
];

function ensureDir(p) {
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
}

// Minimal CSV split (handles quotes)
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
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

function csvEscape(v) {
  const s = (v ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pick(row, keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

async function streamCsv(url, onRow) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 120_000,
    validateStatus: () => true
  });

  if (res.status !== 200) {
    throw new Error(`Download failed ${res.status} for ${url}`);
  }

  const rl = readline.createInterface({ input: res.data, crlfDelay: Infinity });

  let header = null;
  for await (const line of rl) {
    if (!line) continue;

    if (!header) {
      header = splitCsvLine(line);
      continue;
    }

    const cols = splitCsvLine(line);
    const row = {};
    for (let i = 0; i < header.length; i++) row[header[i]] = cols[i] ?? "";
    await onRow(row);
  }
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Building 100k US orgs from IRS EO BMF");
  console.log("Target:", TARGET_COUNT);
  console.log("Source: IRS EO BMF CSV downloads.  [oai_citation:3‡IRS](https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf)");
  console.log("====================================================");

  const out = [];
  const seenEin = new Set();

  for (const url of REGION_URLS) {
    if (out.length >= TARGET_COUNT) break;

    console.log(`📥 Downloading/streaming: ${url}`);

    await streamCsv(url, async (r) => {
      if (out.length >= TARGET_COUNT) return;

      // EO BMF columns can vary slightly; these are common:
      const ein = pick(r, ["EIN", "ein"]);
      const name = pick(r, ["NAME", "name"]);
      const city = pick(r, ["CITY", "city"]);
      const state = pick(r, ["STATE", "state"]);
      const country = "US";

      if (!ein || !name) return;
      if (seenEin.has(ein)) return;
      seenEin.add(ein);

      out.push({
        name,
        ein,
        city: city || null,
        state: state || null,
        country,
        source: "irs-eo-bmf"
      });
    });

    console.log(`✅ Current total: ${out.length}/${TARGET_COUNT}`);
  }

  ensureDir(OUT_JSON);
  ensureDir(OUT_CSV);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  const header = ["name", "ein", "city", "state", "country", "source"];
  const csvOut = [
    header.join(","),
    ...out.map((r) => header.map((h) => csvEscape(r[h] ?? "")).join(","))
  ].join("\n");

  fs.writeFileSync(OUT_CSV, csvOut, "utf8");

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("US orgs written:", out.length);
  console.log("JSON:", OUT_JSON);
  console.log("CSV:", OUT_CSV);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
