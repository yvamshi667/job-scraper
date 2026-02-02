import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || "";
const TARGET_COUNT = Number(process.env.TARGET_COUNT || 100000);

const OUT_JSON = process.env.OUT_JSON || "seeds/us-companies-100k.json";
const OUT_CSV = process.env.OUT_CSV || "seeds/us-companies-100k.csv";

const PER_PAGE = Math.min(200, Number(process.env.PER_PAGE || 200));
const MAX_BATCHES = Number(process.env.MAX_BATCHES || 5000);

// ✅ NEW: set REQUIRE_WEBSITE=false to reach 100k
const REQUIRE_WEBSITE = (process.env.REQUIRE_WEBSITE ?? "false").toLowerCase() === "true";

if (!OPENALEX_API_KEY) {
  console.error("❌ Missing OPENALEX_API_KEY env var");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(p) {
  fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
}

function csvEscape(v) {
  const s = (v ?? "").toString();
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function cleanName(n) {
  const s = (n ?? "").toString().trim().replace(/\s+/g, " ");
  if (s.length < 2) return null;
  return s.length > 200 ? s.slice(0, 200) : s;
}

function normalizeUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s) return null;
  if (s.startsWith("www.")) return "https://" + s;
  return s.startsWith("http") ? s : null;
}

function encodeCursor(c) {
  if (c === "*") return "%2A";
  return encodeURIComponent(c);
}

async function fetchBatch(cursor, batchNum) {
  const base = "https://api.openalex.org/institutions";
  const url =
    `${base}?per-page=${PER_PAGE}` +
    `&cursor=${encodeCursor(cursor)}` +
    `&select=display_name,homepage_url,country_code` +
    `&api_key=${encodeURIComponent(OPENALEX_API_KEY)}`;

  if (batchNum === 1) {
    console.log("🔎 OpenAlex request (masked):", url.replace(encodeURIComponent(OPENALEX_API_KEY), "***"));
  }

  const res = await axios.get(url, { timeout: 60_000, validateStatus: () => true });
  if (res.status !== 200) {
    console.error("❌ OpenAlex HTTP", res.status, "body:", JSON.stringify(res.data).slice(0, 300));
    process.exit(1);
  }
  return res.data;
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Building 100k US organizations from OpenAlex");
  console.log("Target:", TARGET_COUNT);
  console.log("Require website:", REQUIRE_WEBSITE);
  console.log("====================================================");

  const out = [];
  const seen = new Set();
  let cursor = "*";

  for (let batch = 1; batch <= MAX_BATCHES && out.length < TARGET_COUNT; batch++) {
    const data = await fetchBatch(cursor, batch);
    const results = Array.isArray(data?.results) ? data.results : [];

    for (const r of results) {
      if ((r?.country_code || "").toUpperCase() !== "US") continue;

      const name = cleanName(r?.display_name);
      if (!name) continue;

      const website = normalizeUrl(r?.homepage_url);

      // ✅ NEW: optional website requirement
      if (REQUIRE_WEBSITE && !website) continue;

      // Dedup by name + website (so we don’t collapse too aggressively)
      const key = (name.toLowerCase() + "::" + (website || "")).trim();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        name,
        website, // may be null if REQUIRE_WEBSITE=false
        country: "US",
        source: "openalex"
      });

      if (out.length >= TARGET_COUNT) break;
    }

    console.log(`✅ batch ${batch}: fetched=${results.length}, kept=${out.length}`);

    const next = data?.meta?.next_cursor;
    if (!next) break;
    cursor = next;

    await sleep(250);
  }

  ensureDir(OUT_JSON);
  ensureDir(OUT_CSV);

  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  const header = ["name", "website", "country", "source"];
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
