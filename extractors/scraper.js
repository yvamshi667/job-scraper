import crypto from "crypto";
import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

function hash(job) {
  return crypto
    .createHash("sha256")
    .update(job.company + job.title + job.url)
    .digest("hex");
}

const companies = await getCompanies();

if (!companies.length) {
  console.log("⚠️ No active companies found. Exiting.");
  process.exit(0);
}

for (const company of companies) {
  const jobs = await scrapeCompany(company);

  jobs.forEach(job => {
    job.hash = hash(job);
  });

  await sendJobs(jobs);
}

console.log("✅ Scraping completed");
