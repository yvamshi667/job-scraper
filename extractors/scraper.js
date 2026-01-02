// extractors/scraper.js
import { getCompanies, sendJobs } from "./supabase.js";
import { routeATS } from "./router.js";

async function run() {
  console.log("🚀 Starting job scraper");

  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name}`);
      const jobs = await routeATS(company);

      if (jobs && jobs.length > 0) {
        allJobs.push(...jobs);
        console.log(`➡️ Found ${jobs.length} jobs`);
      } else {
        console.log("➡️ Found 0 jobs");
      }
    } catch (err) {
      console.error(`❌ Error scraping ${company.name}:`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
  console.log("🎯 Scrape completed successfully");
}

run().catch((err) => {
  console.error("❌ Fatal scraper error:", err);
  process.exit(1);
});
