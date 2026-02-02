/**
 * Build 100,000 US companies from SAM.gov Entity Management Extract (ESM)
 *
 * Fix: Adds filters so the extract result stays <= 1,000,000 (SAM limit).
 * We filter to ACTIVE registrations.
 *
 * Required ENV:
 *   - SAM_API_KEY
 *
 * Optional ENV:
 *   - OUT_JSON (default seeds/us-companies-100k.json)
 *   - OUT_CSV  (default seeds/us-companies-100k.csv)
 *   - TARGET_COUNT (default 100000)
 *   - POLL_SECONDS (default 15)
 *   - POLL_MAX_TRIES (default 60)
 *   - SAM_FILTER_STATUS (default ACTIVE)
 *
 * Notes:
 * - SAM extract limit: 1,000,000 records. If still too large, we can split by state later.
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const SAM_API_KEY = process.env.SAM_API_KEY || "";
const TARGET_COUNT = Number(process.env.TARGET_COUNT || 100000);

const OUT_JSON = process.env.OUT_JSON || "seeds/us-companies-100k.json";
const OUT_CSV = process.env.OUT_CSV || "seeds/us-companies-100k.csv";

const POLL_SECONDS = Number(process.env.POLL_SECONDS || 15);
const POLL_MAX_TRIES = Number(process.env.POLL_MAX_TRIES || 60);

const SAM_FILTER_STATUS = (process.env.SAM_FILTER_STATUS || "ACTIVE").toUpperCase();

if (!SAM_API_KEY) {
  console.error("❌ Missing SAM_API_KEY env var");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  // Key filters to reduce count below 1M:
  // - samRegistered=Yes
  // - registrationStatus=ACTIVE  (this is the main reducer)
  // - includeSections to get address + status fields
  const url =
    `${BASE}?api_key=${encodeURIComponent(SAM_API_KEY)}` +
    `&format=csv` +
    `&samRegistered=Yes` +
    `&registrationStatus=${encodeURIComponent(SAM_FILTER_STATUS)}` +
    `&includeSections=entityRegistration,coreData`;

  const res = await axios.get(url, {
    timeout: 60_000,
    validateStatus: () => true,
    headers: { Accept: "application/json" }
  });

  if (res.status !== 200) {
    throw new Error(`SAM extract request failed HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 500)}`);
  }

  const data = res.data;
  const asText = typeof data === "string" ? data : JSON.stringify(data);

  const urlMatch =
    asText.match(/https?:\/\/[^\s"']+/g)?.find((u) => u.includes("REPLACE_WITH_API_KEY") || u.includes("api.sam.gov")) || null;

  if (!urlMatch) {
    throw new Error(`SAM extract did not return a downloadable URL. Response snippet: ${asText.slice(0, 800)}`);
  }

  return urlMatch;
}

function injectApiKey(downloadUrl) {
  return downloadUrl.replace("REPLACE_WITH_API_KEY", encodeURIComponent(SAM_API_KEY));
}

async function tryDownloadCsv(downloadUrl) {
  const res = await axios.get(downloadUrl, {
    timeout: 120_000,
    responseType: "text",
    validateStatus: () => true
  });

  if (res.status !== 200) return null;

  const text = String(res.data || "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || !lines[0].includes(",")) return null;
  return text;
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

function parseCsvHeaderAndRows(csvText) {
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
  console.log("Filters:", { samRegistered: "Yes", registrationStatus: SAM_FILTER_STATUS });
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
    throw new Error("❌ CSV not ready within polling window. Increase POLL_MAX_TRIES/POLL_SECONDS.");
  }

  console.log("✅ CSV downloaded, parsing…");

  const { rows } = parseCsvHeaderAndRows(csv);

  const out = [];
  for (const r of rows) {
    const name = pickField(r, ["legalBusinessName", "entityName", "name", "Entity Name", "Legal Business Name"]);
    const uei = pickField(r, ["ueiSAM", "uei", "UEI", "UEI (SAM)"]);
    const city = pickField(r, ["physicalAddressCity", "city", "Physical Address City"]);
    const state = pickField(r, ["physicalAddressStateOrProvince", "state", "Physical Address State"]);
    const zip = pickField(r, ["physicalAddressZip", "zip", "Physical Address ZIP"]);
    const country = pickField(r, ["physicalAddressCountryCode", "countryCode", "Physical Address Country Code"]);
    const status = pickField(r, ["registrationStatus", "entityStatus", "Registration Status"]);

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
      entity_status: status || SAM_FILTER_STATUS,
      source: "sam.gov"
    });

    if (out.length >= TARGET_COUNT) break;
  }

  ensureDir(OUT_JSON);
  ensureDir(OUT_CSV);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

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
