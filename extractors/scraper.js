// extractors/scraper.js
import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

console.log("🚀 Starting job scraper...");

async function runScraper() {
  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  const allJobs = [];

  for (const company of companies) {
    try {
      if (!company.ats && !company.careers_url) {
        console.warn(`⚠️ Missing ATS or URL for ${company.name}`);
        continue;
      }

      console.log(`🔎 Scraping ${company.name}`);
      const jobs = await routeATS(company);

      console.log(`➡️ Found ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ ${company.name} failed:`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
}

runScraper().catch(err => {
  console.error("🔥 Scraper crashed:", err);
  process.exit(1);
});
