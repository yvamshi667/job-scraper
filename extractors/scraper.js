import crypto from "crypto";
import { getCompanies, insertJob } from "./supabase.js";
import { scrapeCompany } from "./router.js";

function hash(job) {
  return crypto
    .createHash("sha256")
    .update(job.company + job.title + job.apply_url)
    .digest("hex");
}

const companies = await getCompanies();

for (const company of companies) {
  const jobs = await scrapeCompany(company);

  for (const job of jobs) {
    job.hash = hash(job);
    await insertJob(job);
  }
}

console.log("Scraping completed");
