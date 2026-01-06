// extractors/discover.js
import { ingestCompanies } from "../supabase.js";
import { detectCareersPage } from "./detect.js";

const SEEDS = [
  "https://stripe.com",
  "https://uber.com",
  "https://zoom.us"
];

async function run() {
  console.log("🚀 Discovering companies...");

  const discovered = [];

  for (const url of SEEDS) {
    try {
      const result = await detectCareersPage(url);
      if (result) {
        discovered.push(result);
        console.log(`✅ Discovered: ${result.name}`);
      } else {
        console.log(`⚠️ No careers page: ${url}`);
      }
    } catch (err) {
      console.warn(`❌ Failed ${url}: ${err.message}`);
    }
  }

  if (discovered.length === 0) {
    console.log("⚠️ No companies discovered");
    return;
  }

  const res = await ingestCompanies(discovered);
  console.log("✅ Ingested companies:", res);
}

run().catch(err => {
  console.error("💥 Discover crashed:", err);
  process.exit(1);
});
