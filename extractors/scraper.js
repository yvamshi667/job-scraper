import crypto from "crypto";
import { getCompanies, insertJob } from "../supabase.js";
import { scrapeCompany } from "./router.js";

function hashJob(job) {
  return crypto
    .createHash("sha256")
    .update(job.company + job.title + job.url)
    .digest("hex");
}

const companies = await getCompanies();
console.log(`Companies loaded: ${companies.length}`);

let totalFound = 0;
let totalInserted = 0;

for (const company of companies) {
  console.log(`\nScraping ${company.name}`);
  const jobs = await scrapeCompany(company);

  totalFound += jobs.length;

  for (const job of jobs) {
    job.hash = hashJob(job);
    const inserted = await insertJob(job);
    if (inserted) totalInserted++;
  }
}

console.log(
  `\n✅ SUMMARY: Found ${totalFound} jobs, Inserted ${totalInserted} new jobs`
);

if (totalFound === 0) {
  console.log("⚠️ No jobs found");
}
