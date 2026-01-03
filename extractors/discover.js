// extractors/discover.js
import "dotenv/config";
import { ingestCompanies } from "../supabase.js";

// ---- CONFIG ----
const MAX_PER_RUN = Number(process.env.DISCOVERY_MAX_PER_RUN || 200);

// Put your seed domains here. Add thousands over time.
// (This is only the START — you’ll expand this list daily.)
const SEEDS = [
  "stripe.com",
  "airbnb.com",
  "doordash.com",
  "figma.com",
  "databricks.com",
  "snowflake.com",
  "coinbase.com",
  "squareup.com",
  "robinhood.com",
  "zoom.us",
  "slack.com",
  "shopify.com"
];

// ---- ATS PROBES ----
async function fetchText(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

function normalizeDomain(d) {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
}

function guessCompanyNameFromDomain(domain) {
  const base = domain.split(".")[0] || domain;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

// Detect common ATS patterns by looking for known markers on /careers or home
async function detectATS(domain) {
  const base = `https://${domain}`;
  const candidates = [
    `${base}/careers`,
    `${base}/jobs`,
    `${base}/careers/jobs`,
    `${base}/company/careers`
  ];

  for (const url of candidates) {
    const { ok, text } = await fetchText(url);
    if (!ok || !text) continue;

    const t = text.toLowerCase();

    if (t.includes("boards.greenhouse.io") || t.includes("greenhouse")) return { ats: "greenhouse", careers_url: url };
    if (t.includes("jobs.lever.co") || t.includes("lever.co")) return { ats: "lever", careers_url: url };
    if (t.includes("ashbyhq.com") || t.includes("jobs.ashbyhq.com")) return { ats: "ashby", careers_url: url };
    if (t.includes("myworkdayjobs.com") || t.includes("workday")) return { ats: "workday", careers_url: url };

    // still a careers page, but unknown ATS
    return { ats: "generic", careers_url: url };
  }

  // if none found, return null
  return null;
}

// Basic US verification: check if page contains US / United States markers.
// (Lightweight. Later we can do deeper API checks per ATS.)
function looksUSRelated(text) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("united states") ||
    t.includes("usa") ||
    t.includes("remote - us") ||
    t.includes("new york") ||
    t.includes("california") ||
    t.includes("texas")
  );
}

async function verifyUS(careersUrl) {
  const { ok, text } = await fetchText(careersUrl);
  if (!ok) return false;
  return looksUSRelated(text);
}

async function run() {
  console.log("🚀 Discovery Queue starting...");
  console.log(`📌 Seeds: ${SEEDS.length}, Max per run: ${MAX_PER_RUN}`);

  const out = [];
  for (const raw of SEEDS.slice(0, MAX_PER_RUN)) {
    const domain = normalizeDomain(raw);

    try {
      console.log(`🔎 Probing: ${domain}`);
      const detected = await detectATS(domain);

      if (!detected) {
        console.log(`⚠️ No careers page detected for ${domain}`);
        continue;
      }

      // US-only focus
      const isUS = await verifyUS(detected.careers_url);
      if (!isUS) {
        console.log(`⛔ Skipping (not US-focused): ${domain}`);
        continue;
      }

      const company = {
        name: guessCompanyNameFromDomain(domain),
        careers_url: detected.careers_url,
        country: "US",
        ats_source: detected.ats,
        active: true
      };

      out.push(company);
      console.log(`✅ Discovered: ${company.name} (${company.ats_source})`);
    } catch (e) {
      console.log(`❌ Probe failed for ${domain}: ${String(e?.message || e)}`);
    }
  }

  if (!out.length) {
    console.log("⚠️ No verified US companies discovered this run.");
    return;
  }

  const res = await ingestCompanies(out);
  console.log(`✅ Discovery ingest done: ${JSON.stringify(res)}`);
}

run().catch((e) => {
  console.error("💥 Discovery crashed:", e);
  process.exit(1);
});
