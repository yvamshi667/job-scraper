import { getCompanies, sendJobs } from "../supabase.js";
import { routeATS } from "./router.js";

const BATCH_SIZE = 200;

(async function runScraper() {
  const companies = await getCompanies();
  console.log(`📦 Companies to scrape: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    const jobs = await routeATS(company);

    console.log(`➡️ Found ${jobs.length} jobs`);

    // ⚠️ DO NOT over-filter
    const normalized = jobs.map(job => ({
      ...job,
      source: "github-scraper",
    }));

    allJobs.push(...normalized);
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  // 🚨 IMPORTANT DEBUG LOG
  console.log(
    `🚀 Jobs before sending: ${allJobs.length}`
  );

  if (allJobs.length === 0) {
    console.warn("⚠️ No jobs to send — exiting");
    return;
  }

  // ✅ SEND IN BATCHES
  console.log(`📤 Sending jobs in batches of ${BATCH_SIZE}`);

  for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
    const batch = allJobs.slice(i, i + BATCH_SIZE);

    console.log(
      `📦 Sending batch ${i / BATCH_SIZE + 1} (${batch.length} jobs)`
    );

    await sendJobs(batch);
  }

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
})();
