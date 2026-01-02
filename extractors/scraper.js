// extractors/scraper.js
import { getCompanies } from "../supabase.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

const companies = await getCompanies();

if (!companies.length) {
  console.warn("⚠️ No companies found — exiting");
  process.exit(0);
}

let totalJobs = 0;

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);
  const jobs = await scrapeCompany(company);
  console.log(`➡️ ${company.name}: ${jobs.length} jobs`);
  totalJobs += jobs.length;
}

console.log(`🎯 TOTAL jobs scraped: ${totalJobs}`);
