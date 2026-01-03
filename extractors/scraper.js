import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

console.log("🚀 Starting job scraper...");

async function run() {
  const companies = await getCompanies();
  console.log(`🏢 Loaded ${companies.length} companies`);

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);
    const jobs = await routeATS(company);
    console.log(`➡️ Found ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  console.log(`📊 TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
