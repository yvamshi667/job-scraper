import { getCompanies, sendJobs } from "../supabase.js";

import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

console.log("🚀 Starting job scraper...");

async function run() {
  const companies = await getCompanies();
  console.log(`📦 Companies fetched: ${companies.length}`);

  let totalJobs = 0;

  for (const company of companies) {
    try {
      console.log(`🔍 Scraping ${company.name}`);

      let jobs = [];

      switch (company.ats_type) {
        case "greenhouse":
          jobs = await scrapeGreenhouse(company);
          break;
        case "lever":
          jobs = await scrapeLever(company);
          break;
        case "ashby":
          jobs = await scrapeAshby(company);
          break;
        default:
          jobs = await scrapeGeneric(company);
      }

      if (!jobs.length) {
        console.warn(`⚠️ ${company.name}: 0 jobs`);
        continue;
      }

      await sendJobs(jobs);
      totalJobs += jobs.length;
    } catch (err) {
      console.error(`❌ ${company.name} failed`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${totalJobs}`);
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
