import fs from "fs";
import { scrapeCompany } from "./router.js";

console.log("🚀 Starting scraper...");

// Load generated A–Z companies
const companies = JSON.parse(
  fs.readFileSync("seeds/greenhouse-atoz.json", "utf8")
);

if (!Array.isArray(companies)) {
  throw new Error("❌ greenhouse-atoz.json is invalid");
}

let allJobs = [];

for (const company of companies) {
  console.log(`🔍 Scraping ${company.name} (${company.ats})`);
  const jobs = await scrapeCompany(company);
  console.log(`✅ ${company.name}: ${jobs.length} jobs`);
  allJobs.push(...jobs);
}

fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(
  "output/jobs.json",
  JSON.stringify(allJobs, null, 2)
);

console.log(`📦 Saved ${allJobs.length} jobs → output/jobs.json`);
