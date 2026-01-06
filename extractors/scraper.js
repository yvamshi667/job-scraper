import fs from "fs";
import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./scrapeAshby.js";

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

for (const company of companies) {
  if (company.ats === "ashby") {
    await scrapeAshby(company);
  } else {
    await scrapeGeneric(company);
  }
}

console.log("✅ Scraping complete");
