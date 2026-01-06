import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeGeneric } from "./scrapeGeneric.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Starting scraper...");

const companiesPath = path.join(__dirname, "../companies.json");

if (!fs.existsSync(companiesPath)) {
  console.warn("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

if (!Array.isArray(companies) || companies.length === 0) {
  console.warn("⚠️ No companies to scrape");
  process.exit(0);
}

let totalJobs = 0;

for (const company of companies) {
  console.log(`🔍 Scraping ${company.name}`);
  const jobs = await scrapeGeneric(company);
  console.log(`📦 Found ${jobs.length} jobs`);
  totalJobs += jobs.length;
}

console.log(`🎉 TOTAL jobs scraped: ${totalJobs}`);
