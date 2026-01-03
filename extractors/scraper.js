import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

async function run() {
  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      const jobs = await scrapeCompany(company);
      console.log(`➡️ ${company.name}: ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.warn(`⚠️ Failed ${company.name}`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  await sendJobs(allJobs);
  console.log("🎉 Scrape completed successfully");
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
