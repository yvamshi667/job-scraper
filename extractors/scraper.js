import { getCompanies, sendJobs } from "../supabase.js";
import scrapeCompany from "./router.js";

(async function run() {
  const companies = await getCompanies();
  console.log(`Companies loaded: ${companies.length}`);

  let totalFound = 0;
  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);
    const jobs = await scrapeCompany(company);
    console.log(`→ ${jobs.length} jobs`);

    totalFound += jobs.length;
    allJobs.push(...jobs);
  }

  console.log(`✅ SUMMARY: Found ${totalFound} jobs`);

  if (allJobs.length > 0) {
    await sendJobs(allJobs);
    console.log("📤 Jobs sent to Supabase");
  } else {
    console.log("⚠️ No jobs found");
  }
})();
