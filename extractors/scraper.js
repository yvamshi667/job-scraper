// extractors/scraper.js
import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

const companies = await getCompanies();

if (!companies.length) {
  console.warn("⚠️ No companies found — exiting");
  process.exit(0);
}

let allJobs = [];

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);
  const jobs = await scrapeCompany(company);
  console.log(`➡️ Found ${jobs.length} jobs`);
  allJobs.push(...jobs);
}

console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
await sendJobs(allJobs);
