import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

console.log("🚀 Starting job scraper...");

async function run() {
  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name}`);
      const jobs = await routeATS(company);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ Failed ${company.name}`, err.message);
    }
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
  console.log("🎉 Scrape completed");
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
