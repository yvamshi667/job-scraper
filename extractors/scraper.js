import routeScraper from "./router.js";
import { getCompanies, insertJob } from "../supabase.js";

const companies = await getCompanies();

console.log(`Companies loaded: ${companies.length}`);

let totalFound = 0;
let totalInserted = 0;

for (const company of companies) {
  console.log(`Scraping ${company.name}`);
  const jobs = await routeScraper(company);

  totalFound += jobs.length;

  for (const job of jobs) {
    const inserted = await insertJob(job);
    if (inserted) totalInserted++;
  }
}

console.log(`SUMMARY: Found ${totalFound} jobs, Inserted ${totalInserted} new jobs`);

if (totalFound === 0) {
  console.log("No jobs found");
}
