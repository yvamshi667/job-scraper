import fs from "fs";
import { routeScraper } from "./router.js";

const COMPANIES_FILE = "companies.json";
const OUTPUT_DIR = "output";
const OUTPUT_FILE = `${OUTPUT_DIR}/jobs.json`;

async function runScraper() {
  console.log("🚀 Starting scraper...");

  if (!fs.existsSync(COMPANIES_FILE)) {
    console.error("❌ companies.json not found. Run discover first.");
    process.exit(1);
  }

  const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));
  const allJobs = [];

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name} (${company.ats || "generic"})`);
    const jobs = await routeScraper(company);
    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allJobs, null, 2));

  console.log(`📦 Saved ${allJobs.length} jobs → ${OUTPUT_FILE}`);
}

runScraper();
