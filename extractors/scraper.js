// extractors/scraper.js
import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

async function runScraper() {
  console.log("🚀 Starting job scraper...");

  // ✅ USE SAFE getCompanies (no throwing)
  const companies = await getCompanies();

  console.log(`📦 Companies loaded: ${companies.length}`);

  if (!companies.length) {
    console.warn("⚠️ No active companies found. Exiting scraper safely.");
    return;
  }

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    try {
      const jobs = await routeATS(company);

      console.log(`→ Found ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ Error scraping ${company.name}:`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  if (!allJobs.length) {
    console.warn("⚠️ No jobs scraped. Nothing to send.");
    return;
  }

  await sendJobs(allJobs);
}

runScraper().catch((err) => {
  console.error("🔥 Scraper crashed:", err);
  process.exit(1);
});
