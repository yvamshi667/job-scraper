import { getCompanies, insertJob } from "./supabase.js";
import { scrapeCompany } from "./router.js";

const companies = await getCompanies();

console.log(`🏢 Companies loaded: ${companies.length}`);

let totalFound = 0;
let totalInserted = 0;

for (const company of companies) {
  console.log(`🚀 Scraping ${company.name}`);
  const jobs = await scrapeCompany(company);

  console.log(`➡️ ${company.name}: ${jobs.length} jobs found`);
  totalFound += jobs.length;

  for (const job of jobs) {
    const inserted = await insertJob(job);
    if (inserted) totalInserted++;
  }
}

console.log(
  `✅ SUMMARY: Found ${totalFound} jobs | Inserted ${totalInserted} new jobs`
);
