import fs from "fs";
import path from "path";
import { scrapeAshby } from "./scrapeAshby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

const COMPANIES_PATH = "companies.json";
const OUT_DIR = "output";
const OUT_FILE = path.join(OUT_DIR, "jobs.json");

async function run() {
  console.log("🚀 Starting scraper...");

  if (!fs.existsSync(COMPANIES_PATH)) {
    console.log("⚠️ companies.json not found. Run discover first.");
    process.exit(0);
  }

  const companies = JSON.parse(fs.readFileSync(COMPANIES_PATH, "utf-8"));
  if (!Array.isArray(companies) || companies.length === 0) {
    console.log("⚠️ No companies to scrape");
    process.exit(0);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

  const allJobs = [];

  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name} (${company.ats})`);

      let jobs = [];

      if (company.ats === "ashby") {
        jobs = await scrapeAshby(company);
      } else {
        jobs = await scrapeGeneric(company);
      }

      console.log(`✅ ${company.name}: ${jobs.length} jobs/links`);
      allJobs.push(...jobs);
    } catch (e) {
      console.log(`❌ ${company.name} failed: ${e.message}`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allJobs, null, 2));
  console.log(`📦 Saved ${allJobs.length} records to ${OUT_FILE}`);
}

run();
