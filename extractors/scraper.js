import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANIES_FILE = path.join(__dirname, "..", "companies.json");

(async function scrape() {
  console.log("🚀 Starting scraper...");

  if (!fs.existsSync(COMPANIES_FILE)) {
    console.log("⚠️ companies.json not found. Run discover first.");
    return;
  }

  const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));
  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    let jobs = [];

    switch (company.ats) {
      case "ashby":
        jobs = await scrapeAshby(company);
        break;

      default:
        jobs = await scrapeGeneric(company);
    }

    console.log(`➡️ Found ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);
})();
