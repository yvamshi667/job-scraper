// extractors/scraper.js

import { getCompanies, sendJobs } from "./supabase.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

const companies = await getCompanies();
console.log(`📦 Companies fetched: ${companies.length}`);

let totalJobs = 0;

for (const company of companies) {
  try {
    console.log(`🔍 Scraping ${company.name}`);
    const jobs = await scrapeCompany(company);

    if (jobs.length) {
      await sendJobs(jobs);
      totalJobs += jobs.length;
    } else {
      console.warn(`⚠️ ${company.name}: 0 jobs`);
    }
  } catch (err) {
    console.error(`❌ ${company.name} failed`, err.message);
  }
}

console.log(`🎯 TOTAL jobs scraped: ${totalJobs}`);
