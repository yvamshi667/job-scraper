import { ingestCompanies } from "../supabase.js";
import { detectCareersPage } from "../detect.js"; // ✅ FIXED PATH

const SEEDS = [
  "https://stripe.com",
  "https://uber.com",
  "https://zoom.us"
];

async function run() {
  console.log("🚀 Discovering companies...");

  const companies = [];

  for (const url of SEEDS) {
    try {
      const result = await detectCareersPage(url);

      if (result) {
        companies.push(result);
        console.log(`✅ Found ${result.name}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to probe ${url}`, err.message);
    }
  }

  if (!companies.length) {
    console.log("⚠️ No companies discovered");
    return;
  }

  await ingestCompanies(companies);
  console.log("🎉 Discovery complete");
}

run().catch(err => {
  console.error("💥 Discover failed:", err);
  process.exit(1);
});
