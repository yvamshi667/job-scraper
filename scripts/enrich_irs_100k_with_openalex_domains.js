import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const OPENALEX_API_KEY = process.env.OPENALEX_API_KEY || "";
const IN_FILE = process.env.IN_FILE || "seeds/us-orgs-100k-irs.json";
const OUT_FILE = process.env.OUT_FILE || "seeds/us-orgs-100k-enriched.json";
const LIMIT = Number(process.env.LIMIT || 100000);
const MAX_LOOKUPS = Number(process.env.MAX_LOOKUPS || 20000); // start with 20k lookups/day to stay safe
const SLEEP_MS = Number(process.env.SLEEP_MS || 150);

if (!OPENALEX_API_KEY) {
  console.error("❌ Missing OPENALEX_API_KEY");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normName(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeUrl(u) {
  const s = (u ?? "").toString().trim();
  if (!s) return null;
  if (s.startsWith("www.")) return "https://" + s;
  return s.startsWith("http") ? s : null;
}

async function searchOpenAlexInstitutionByName(name) {
  // OpenAlex institutions search endpoint
  const url =
    `https://api.openalex.org/institutions` +
    `?search=${encodeURIComponent(name)}` +
    `&per-page=5` +
    `&select=display_name,homepage_url,country_code` +
    `&api_key=${encodeURIComponent(OPENALEX_API_KEY)}`;

  const res = await axios.get(url, { timeout: 60_000, validateStatus: () => true });
  if (res.status !== 200) return null;

  const results = Array.isArray(res.data?.results) ? res.data.results : [];
  const target = normName(name);

  // Pick best match: US + closest normalized name
  let best = null;
  for (const r of results) {
    if ((r?.country_code || "").toUpperCase() !== "US") continue;
    const cand = normName(r?.display_name);
    if (!cand) continue;
    // simple containment score
    const score =
      (cand === target ? 100 : 0) +
      (cand.includes(target) ? 10 : 0) +
      (target.includes(cand) ? 5 : 0);

    if (!best || score > best.score) best = { score, r };
  }

  if (!best) return null;
  const website = normalizeUrl(best.r?.homepage_url);
  if (!website) return null;
  return website;
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Enrich IRS 100k with website using OpenAlex");
  console.log("Input:", IN_FILE);
  console.log("Output:", OUT_FILE);
  console.log("Max lookups this run:", MAX_LOOKUPS);
  console.log("====================================================");

  const raw = fs.readFileSync(path.resolve(IN_FILE), "utf8");
  const list = JSON.parse(raw);

  const out = [];
  let lookups = 0;
  let enriched = 0;

  for (let i = 0; i < Math.min(list.length, LIMIT); i++) {
    const item = list[i];
    const name = item?.name;
    if (!name) continue;

    let website = null;

    if (lookups < MAX_LOOKUPS) {
      lookups++;
      website = await searchOpenAlexInstitutionByName(name);
      await sleep(SLEEP_MS);
    }

    if (website) enriched++;

    out.push({
      ...item,
      website: website || null
    });

    if ((i + 1) % 1000 === 0) {
      console.log(`✅ processed=${i + 1} lookups=${lookups} enriched=${enriched}`);
    }
  }

  fs.mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Processed:", out.length);
  console.log("Lookups:", lookups);
  console.log("Enriched with website:", enriched);
  console.log("Wrote:", OUT_FILE);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
