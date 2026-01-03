// extractors/scraper.js
import { getCompanies, ingestJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  console.log(`📦 Companies fetched: ${companies.length}`);

  let total = 0;

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name}`);

    try {
      const jobs = await scrapeCompany(company);
      if (!jobs.length) {
        console.warn(`⚠️ ${company.name}: 0 jobs`);
        continue;
      }

      await ingestJobs(jobs);
      total += jobs.length;

      console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    } catch (err) {
      console.error(`❌ ${company.name} failed:`, err.message);
    }
  }

  console.log(`🏁 TOTAL jobs scraped: ${total}`);
}

run().catch((err) => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
