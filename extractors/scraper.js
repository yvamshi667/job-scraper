import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

export async function runScraper() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name}`);
      const jobs = await routeATS(company);
      console.log(`➡️ Found ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (e) {
      console.error(`❌ Failed ${company.name}`, e.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
}

runScraper();
