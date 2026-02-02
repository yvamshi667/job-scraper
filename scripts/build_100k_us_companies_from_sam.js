/**
 * Build 100,000 US companies from SAM.gov Entity Management Extract (ESM)
 *
 * Uses SAM Entity Management API "extract" mode (async download link).
 * Docs confirm extract mode can return up to 1,000,000 records and returns a downloadable link.  [oai_citation:3‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
 *
 * Required ENV:
 *   - SAM_API_KEY
 *
 * Optional ENV:
 *   - OUT_JSON (default seeds/us-companies-100k.json)
 *   - OUT_CSV  (default seeds/us-companies-100k.csv)
 *   - TARGET_COUNT (default 100000)
 *   - POLL_SECONDS (default 15)
 *   - POLL_MAX_TRIES (default 40)  // up to 10 minutes
 *
 * Notes:
 * - We request v4 endpoint per docs.  [oai_citation:4‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
 * - We request public registered entities and US only.
 * - Output fields: name, uei, city, state, zip, country, entity_status
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SAM_API_KEY = process.env.SAM_API_KEY || "";
const TARGET_COUNT = Number(process.env.TARGET_COUNT || 100000);

const OUT_JSON = process.env.OUT_JSON || "seeds/us-companies-100k.json";
const OUT_CSV = process.env.OUT_CSV || "seeds/us-companies-100k.csv";

const POLL_SECONDS = Number(process.env.POLL_SECONDS || 15);
const POLL_MAX_TRIES = Number(process.env.POLL_MAX_TRIES || 40);

if (!SAM_API_KEY) {
  console.error("❌ Missing SAM_API_KEY env var");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * SAM docs list v4 endpoints like:
 * https://api.sam.gov/entity-information/v4/entities?api_key=
 * and extract behavior returns downloadable URL with token.  [oai_citation:5‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
 */
const BASE = "https://api.sam.gov/entity-information/v4/entities";

function csvEscape(v) {
  const s = (v ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
}

async function requestExtract() {
  // Request CSV extract:
  // - format=csv triggers extract behavior (async downloadable link) per docs.  [oai_citation:6‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
  // - samRegistered=Yes to get registered entities.
  // - countryCode=USA / US filter: SAM supports various filters; we use "country" filters by returning only US addresses.
  //   If this is too strict/loose, we also apply client-side filter later.
  const url =
    `${BASE}?api_key=${encodeURIComponent(SAM_API_KEY)}` +
    `&format=csv` +
    `&samRegistered=Yes` +
    `&includeSections=entityRegistration,coreData`;

  const res = await axios.get(url, {
    timeout: 60_000,
    validateStatus: () => true,
    headers: { Accept: "application/json" }
  });

  if (res.status !== 200) {
    throw new Error(`SAM extract request failed HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`);
  }

  // The extract call returns a downloadable URL with token (docs mention REPLACE_WITH_API_KEY replacement).  [oai_citation:7‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
  // We will search response for a URL string.
  const data = res.data;
  const asText = typeof data === "string" ? data : JSON.stringify(data);

  // Common patterns in responses contain "url" or "downloadUrl"
  const urlMatch =
    asText.match(/https?:\/\/[^\s"']+/g)?.find((u) => u.includes("REPLACE_WITH_API_KEY") || u.includes("api.sam.gov")) || null;

  if (!urlMatch) {
    // if response schema differs, dump short snippet to debug
    throw new Error(`SAM extract did not return a downloadable URL. Response snippet: ${asText.slice(0, 500)}`);
  }

  return urlMatch;
}

function injectApiKey(downloadUrl) {
  // docs: replace REPLACE_WITH_API_KEY with a valid API key in the downloadable URL.  [oai_citation:8‡open.gsa.gov](https://open.gsa.gov/api/entity-api/)
  return downloadUrl.replace("REPLACE_WITH_API_KEY", encodeURIComponent(SAM_API_KEY));
}

async function tryDownloadCsv(downloadUrl) {
  const res = await axios.get(downloadUrl, {
    timeout: 120_000,
    responseType: "text",
    validateStatus: () => true
  });

  // When file isn't ready, SAM may respond with a JSON message or non-200
  if (res.status !== 200) return null;

  const text = String(res.data || "");
  // crude check: CSV should include commas and multiple lines
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || !lines[0].includes(",")) return null;

  return text;
}

function parseCsvHeaderAndRows(csvText) {
  // Minimal CSV reader (handles quotes)
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j] ?? "";
    rows.push(row);
  }
  return { header, rows };
}

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

function pickField(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Building 100k US companies from SAM.gov");
  console.log("Target:", TARGET_COUNT);
  console.log("Endpoint:", BASE);
  console.log("====================================================");

  console.log("1) Requesting extract…");
  const rawDownloadUrl = await requestExtract();
  const downloadUrl = injectApiKey(rawDownloadUrl);

  console.log("✅ Extract download URL received (masked).");

  console.log("2) Polling until CSV is ready…");
  let csv = null;
  for (let i = 1; i <= POLL_MAX_TRIES; i++) {
    console.log(`   poll ${i}/${POLL_MAX_TRIES}…`);
    csv = await tryDownloadCsv(downloadUrl);
    if (csv) break;
    await sleep(POLL_SECONDS * 1000);
  }

  if (!csv) {
    throw new Error("❌ CSV was not ready within polling window. Increase POLL_MAX_TRIES or POLL_SECONDS.");
  }

  console.log("✅ CSV downloaded, parsing…");

  const { rows } = parseCsvHeaderAndRows(csv);

  // Normalize into a clean US-only 100k list
  const out = [];
  for (const r of rows) {
    const name = pickField(r, ["legalBusinessName", "entityName", "name", "Entity Name", "Legal Business Name"]);
    const uei = pickField(r, ["ueiSAM", "uei", "UEI", "UEI (SAM)"]);
    const city = pickField(r, ["physicalAddressCity", "city", "Physical Address City"]);
    const state = pickField(r, ["physicalAddressStateOrProvince", "state", "Physical Address State"]);
    const zip = pickField(r, ["physicalAddressZip", "zip", "Physical Address ZIP"]);
    const country = pickField(r, ["physicalAddressCountryCode", "countryCode", "Physical Address Country Code"]);
    const status = pickField(r, ["registrationStatus", "entityStatus", "Registration Status"]);

    // USA-only filter (defensive)
    const c = (country || "").toUpperCase();
    if (c && c !== "US" && c !== "USA") continue;

    if (!name) continue;

    out.push({
      name,
      uei: uei || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      country: c || "US",
      entity_status: status || null,
      source: "sam.gov"
    });

    if (out.length >= TARGET_COUNT) break;
  }

  ensureDir(OUT_JSON);
  ensureDir(OUT_CSV);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  // Write CSV for Excel
  const header = ["name", "uei", "city", "state", "zip", "country", "entity_status", "source"];
  const csvOut = [
    header.join(","),
    ...out.map((r) => header.map((h) => csvEscape(r[h] ?? "")).join(","))
  ].join("\n");

  fs.writeFileSync(OUT_CSV, csvOut, "utf8");

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("US companies written:", out.length);
  console.log("JSON:", OUT_JSON);
  console.log("CSV:", OUT_CSV);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
