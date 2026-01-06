import fs from "fs";
import { scrapeGenericCareers } from "./scrapeGeneric.js";

console.log("🚀 Starting scraper...");

if (!fs.existsSync("companies.json")) {
  console.warn("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync("companies.json", "utf-8"));

if (!Array.isArray(companies) || companies.length === 0) {
  console.warn("⚠️ No companies to scrape");
  process.exit(0);
}

let total = 0;

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);

  try {
    const jobs = await scrapeGenericCareers(company.careers_url);
    console.log(`📦 Found ${jobs.length} jobs`);
    total += jobs.length;
  } catch (err) {
    console.error(`❌ Failed scraping ${company.name}`, err.message);
  }
}

console.log(`🎉 TOTAL jobs scraped: ${total}`);
