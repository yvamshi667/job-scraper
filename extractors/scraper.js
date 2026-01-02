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
  const jobs = await scrapeCompany(company);
  allJobs.push(...jobs);
}

console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

await sendJobs(allJobs);
