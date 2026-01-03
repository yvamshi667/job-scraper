// extractors/discover.js
import { ingestCompanies } from "../supabase.js";
import { normalizeDomain, detectATS } from "../detect.js";

const SEEDS = [
  "stripe.com",
  "airbnb.com",
  "figma.com",
  "databricks.com",
  "snowflake.com",
  "coinbase.com",
  "squareup.com",
  "robinhood.com",
  "zoom.us",
  "slack.com",
  "shopify.com",
  "doordash.com"
];

const MAX_PER_RUN = Number(process.env.DISCOVER_MAX_PER_RUN || 200);
const COUNTRY = (process.env.DISCOVER_COUNTRY || "US").toUpperCase();

async function probe(domain) {
  // simple probe strategy: try common careers paths
  const candidates = [
    `https://${domain}/careers`,
    `https://${domain}/jobs`,
    `https://${domain}/careers/jobs`,
    `https://${domain}/about/careers`
  ];

  for (const u of candidates) {
    try {
      const res = await fetch(u, { redirect: "follow" });
      if (!res.ok) continue;
      const html = await res.text().catch(() => "");
      const ats = detectATS({ careersUrl: u, html });
      return { careers_url: u, ats_source: ats };
    } catch {
      // ignore
    }
  }
  return null;
}

async function run() {
  console.log("🚀 Discovery Queue starting...");
  console.log(`🌱 Seeds: ${SEEDS.length}, Max per run: ${MAX_PER_RUN}`);

  const discovered = [];
  for (const seed of SEEDS.slice(0, MAX_PER_RUN)) {
    const domain = normalizeDomain(seed);
    if (!domain) continue;

    console.log(`🔎 Probing: ${domain}`);
    const r = await probe(domain);

    if (!r) {
      console.log(`⚠️ No careers page detected for ${domain}`);
      continue;
    }

    const companyName = domain.split(".")[0];
    discovered.push({
      name: companyName,
      careers_url: r.careers_url,
      country: COUNTRY,
      ats_source: r.ats_source,
      active: true
    });

    console.log(`✅ Discovered: ${companyName} (${r.ats_source})`);
  }

  if (!discovered.length) {
    console.log("No companies discovered.");
    return;
  }

  const resp = await ingestCompanies(discovered);
  console.log("✅ Discovery ingest done:", resp);
}

run().catch((e) => {
  console.error("💥 Discovery crashed:", e);
  process.exit(1);
});
