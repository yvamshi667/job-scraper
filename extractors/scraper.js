import { getCompanies } from "./getCompanies.js";
import { ingestJobs } from "./ingestJobs.js";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting job scraper...");

const companies = await getCompanies();
console.log(`📦 Companies fetched: ${companies.length}`);

let total = 0;

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);

  try {
    const jobs = await scrapeCompany(company);
    await ingestJobs(jobs);

    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    total += jobs.length;
  } catch (err) {
    console.error(`❌ ${company.name} failed:`, err.message);
  }
}

console.log(`🎯 TOTAL jobs scraped: ${total}`);
