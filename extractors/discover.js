// extractors/discover.js
import { ingestCompanies } from "../supabase.js";
import { detectATS } from "./detect.js";

const SEED_DOMAINS = [
  "figma.com",
  "databricks.com",
  "snowflake.com",
  "stripe.com",
  "shopify.com",
  "robinhood.com",
  "zoom.us",
  "slack.com",
  "airbnb.com",
  "doordash.com",
];

export async function runDiscovery() {
  console.log("🔍 Starting discovery...");

  const discovered = [];

  for (const domain of SEED_DOMAINS) {
    console.log(`🔎 Probing: ${domain}`);

    try {
      const result = await detectATS(domain);
      if (!result?.careers_url) {
        console.warn(`⚠️ No careers page detected for ${domain}`);
        continue;
      }

      discovered.push({
        name: result.company || domain.split(".")[0],
        careers_url: result.careers_url,
        ats_source: result.ats,
        country: "US",
        active: true,
      });

      console.log(`✅ Discovered: ${result.company} (${result.ats})`);
    } catch (e) {
      console.warn(`⚠️ Discovery error for ${domain}: ${e.message}`);
    }
  }

  // ✅ Deduplicate by careers_url (FINAL FIX)
  const seen = new Set();
  const unique = discovered.filter((c) => {
    if (seen.has(c.careers_url)) return false;
    seen.add(c.careers_url);
    return true;
  });

  console.log(`📦 Sending ${unique.length} companies to ingest`);
  await ingestCompanies(unique);

  console.log("🎉 Discovery completed successfully");
}

if (process.argv[1].includes("discover.js")) {
  runDiscovery().catch((err) => {
    console.error("💥 Discovery crashed:", err);
    process.exit(1);
  });
}
