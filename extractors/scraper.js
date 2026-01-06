import fs from "fs";
import scrapeAshby from "./scrapeAshby.js";
import scrapeGeneric from "./scrapeGeneric.js";

console.log("🚀 Starting scraper...");

if (!fs.existsSync("companies.json")) {
  console.log("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync("companies.json"));

for (const company of companies) {
  console.log(`🔍 Scraping ${company.name}`);

  if (company.ats === "ashby") {
    await scrapeAshby(company);
  } else {
    await scrapeGeneric(company);
  }
}
