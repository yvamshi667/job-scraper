import routeScraper from "./router.js";
import { getCompanies, sendJobs } from "../supabase.js";

console.log("🚀 Starting scraper...");

const companies = await getCompanies();
let allJobs = [];

for (const company of companies) {
  const jobs = await routeScraper(company);
  console.log(`📦 ${company.name}: ${jobs.length} jobs`);
  allJobs.push(...jobs);
}

console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

if (allJobs.length > 0) {
  await sendJobs(allJobs);
}

console.log("🎉 Scrape completed successfully");
