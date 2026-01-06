import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeGeneric } from "./scrapeGeneric.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("🚀 Starting scraper...");

  const companiesPath = path.join(__dirname, "companies.json");

  if (!fs.existsSync(companiesPath)) {
    console.warn("⚠️ companies.json not found. Run discover first.");
    return;
  }

  const companies = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

  if (!Array.isArray(companies) || companies.length === 0) {
    console.warn("⚠️ No companies to scrape");
    return;
  }

  let totalJobs = 0;

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    const jobs = await scrapeGeneric(company.careers_url);

    console.log(`📦 Found ${jobs.length} jobs`);
    totalJobs += jobs.length;
  }

  console.log(`🎉 TOTAL jobs scraped: ${totalJobs}`);
}

run();
