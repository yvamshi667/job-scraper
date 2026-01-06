import { ingestCompanies } from "../supabase.js";
import { detectCareersPage } from "../detect.js";

const SEEDS = [
  "https://stripe.com",
  "https://uber.com",
  "https://zoom.us"
];

async function run() {
  console.log("🚀 Discovering companies...");

  const companies = [];

  for (const url of SEEDS) {
    const result = await detectCareersPage(url);
    if (result) {
      companies.push(result);
      console.log(`✅ Found ${result.name}`);
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
  console.error(err);
  process.exit(1);
});
