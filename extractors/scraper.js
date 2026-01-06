import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import router from "./router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANIES_FILE = path.join(__dirname, "../companies.json");

console.log("🚀 Starting scraper...");

if (!fs.existsSync(COMPANIES_FILE)) {
  console.warn("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));

if (!Array.isArray(companies) || companies.length === 0) {
  console.warn("⚠️ No companies to scrape");
  process.exit(0);
}

let allJobs = [];

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);
  try {
    const jobs = await router(company);
    console.log(`➡️ Found ${jobs.length} jobs`);
    allJobs.push(...jobs);
  } catch (err) {
    console.error(`❌ Failed ${company.name}`, err.message);
  }
}

console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);
console.log("🎉 Scrape completed successfully");
