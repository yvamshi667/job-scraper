// extractors/scraper.js

import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

async function run() {
  const companies = await getCompanies();

  if (!companies.length) {
    console.warn("⚠️ No companies found — exiting");
    return;
  }

  console.log(`📦 Companies fetched: ${companies.length}`);

  let totalJobs = 0;

  for (const company of companies) {
    try {
      console.log(`🔍 Scraping ${company.name}`);
      const jobs = await scrapeCompany(company);

      if (!jobs.length) {
        console.warn(`⚠️ ${company.name}: 0 jobs`);
        continue;
      }

      totalJobs += jobs.length;
      await sendJobs(jobs);
    } catch (err) {
      console.error(`❌ ${company.name} failed`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${totalJobs}`);
}

run().catch(err => {
  console.error("❌ Fatal scraper error", err);
  process.exit(1);
});
