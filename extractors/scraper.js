import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./ashby.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeWorkday from "./workday.js";
import { getCompanies, sendJobs } from "../supabase.js";

console.log("🚀 Starting scraper...");

const SCRAPERS = {
  generic: scrapeGeneric,
  ashby: scrapeAshby,
  greenhouse: scrapeGreenhouse,
  workday: scrapeWorkday
};

async function run() {
  const result = await getCompanies();

  // ✅ FIX: normalize companies to array
  const companies = Array.isArray(result)
    ? result
    : result?.data || [];

  if (!Array.isArray(companies)) {
    throw new Error("❌ getCompanies() did not return an array");
  }

  if (companies.length === 0) {
    console.warn("⚠️ No companies to scrape");
    return;
  }

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    const scraper = SCRAPERS[company.platform] || SCRAPERS.generic;

    try {
      const jobs = await scraper(company);

      if (Array.isArray(jobs) && jobs.length > 0) {
        allJobs.push(...jobs);
        console.log(`✅ Found ${jobs.length} jobs`);
      } else {
        console.warn(`⚠️ Found 0 jobs`);
      }
    } catch (err) {
      console.error(`❌ Failed scraping ${company.name}`, err.message);
    }
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

  if (allJobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  await sendJobs(allJobs);

  console.log("🎉 Scrape completed successfully");
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
