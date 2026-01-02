import { sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";
import companies from "../companies.json" assert { type: "json" };

async function run() {
  console.log("🚀 Starting job scraper...");

  let allJobs = [];

  for (const company of companies) {
    const jobs = await scrapeCompany(company);
    allJobs.push(...jobs);
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  await sendJobs(allJobs);
}

run().catch(err => {
  console.error("❌ Scraper failed:", err);
  process.exit(1);
});
