import { getCompanies, sendJobs } from "../supabase.js";
import scrapeCompany from "./router.js";

(async function run() {
  const companies = await getCompanies();

  console.log(`Companies loaded: ${companies.length}`);

  if (!companies.length) {
    console.log("No companies to scrape. Exiting.");
    return;
  }

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);
    const jobs = await scrapeCompany(company);
    console.log(`→ Found ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  await sendJobs(allJobs);
})();
