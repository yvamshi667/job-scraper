import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

/**
 * Main scraper entry
 */
async function run() {
  const companies = await getCompanies();

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

  if (allJobs.length === 0) {
    console.warn("⚠️ No jobs to send");
    return;
  }

  const BATCH_SIZE = 200;
  console.log(`🚀 Sending ${allJobs.length} jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
    const batch = allJobs.slice(i, i + BATCH_SIZE);
    await sendJobs(batch);
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
}

run().catch(err => {
  console.error("🔥 Scraper crashed", err);
  process.exit(1);
});
