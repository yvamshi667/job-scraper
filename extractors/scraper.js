import scrapeCompany from "./router.js";
import { getCompanies, sendJobs } from "../supabase.js";

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);
    const jobs = await scrapeCompany(company);
    allJobs.push(...jobs);
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

  await sendJobs(allJobs);
  console.log("✅ Scrape completed successfully");
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
