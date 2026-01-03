import { detectATS } from "../detect.js";
import { ingestCompanies } from "../supabase.js";

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

const MAX_PER_RUN = 200;

export async function run() {
  console.log("🚀 Discovery Queue starting...");
  console.log(`🌱 Seeds: ${SEEDS.length}, Max per run: ${MAX_PER_RUN}`);

  const discovered = [];

  for (const domain of SEEDS) {
    console.log(`🔍 Probing: ${domain}`);

    try {
      const result = await detectATS(domain);

      if (!result || !result.careers_url) {
        console.warn(`⚠️ No careers page detected for ${domain}`);
        continue;
      }

      console.log(
        `✅ Discovered: ${result.name} (${result.ats_source})`
      );

      discovered.push({
        name: result.name,
        careers_url: result.careers_url,
        ats_source: result.ats_source,
        country: "US",
        active: true
      });

      if (discovered.length >= MAX_PER_RUN) break;
    } catch (err) {
      console.error(`❌ Failed probing ${domain}`, err.message);
    }
  }

  if (!discovered.length) {
    console.log("⚠️ No companies discovered this run");
    return;
  }

  const res = await ingestCompanies(discovered);
  console.log("✅ Discovery ingest done:", res);
}

run().catch((err) => {
  console.error("💥 Discovery crashed:", err);
  process.exit(1);
});
