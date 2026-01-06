import fs from "fs";
import scrapeGeneric from "./scrapeGeneric.js";

console.log("🚀 Starting scraper...");

if (!fs.existsSync("companies.json")) {
  console.log("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync("companies.json", "utf-8"));

if (!Array.isArray(companies) || companies.length === 0) {
  console.log("⚠️ No companies to scrape");
  process.exit(0);
}

let total = 0;

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);
  const jobs = await scrapeGeneric(company);
  console.log(`📦 Found ${jobs.length} jobs`);
  total += jobs.length;
}

console.log(`🎉 TOTAL jobs scraped: ${total}`);
