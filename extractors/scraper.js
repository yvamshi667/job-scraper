import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name} (${company.ats_source || "generic"})`);
      const jobs = await scrapeCompany(company);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`⚠️ Failed ${company.name}:`, err.message);
    }
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

  if (allJobs.length) {
    await sendJobs(allJobs);
  }

  console.log("✅ Scrape completed successfully");
}

run().catch((err) => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
