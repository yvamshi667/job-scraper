import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();

  console.log(`📦 Companies loaded: ${companies.length}`);
  if (!companies.length) {
    console.warn("⚠️ No companies found. Exiting.");
    return;
  }

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    try {
      const jobs = await routeATS(company);

      console.log(`→ Found ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ Failed scraping ${company.name}`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  if (!allJobs.length) {
    console.warn("⚠️ No jobs to send.");
    return;
  }

  await sendJobs(allJobs);
}

run().catch(err => {
  console.error("🔥 Fatal scraper error:", err);
  process.exit(1);
});
