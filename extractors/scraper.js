import fs from "fs";
import { routeScraper } from "./router.js";

const COMPANIES_FILE = "companies.json";
const OUTPUT_FILE = "output/jobs.json";

async function run() {
  if (!fs.existsSync(COMPANIES_FILE)) {
    console.error("❌ companies.json not found. Run discover first.");
    process.exit(1);
  }

  const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));
  const allJobs = [];

  console.log("🚀 Starting scraper...");

  for (const company of companies) {
    try {
      const jobs = await routeScraper(company);
      console.log(`✅ ${company.name}: ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ ${company.name} failed`, err.message);
    }
  }

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allJobs, null, 2));

  console.log(`📦 Saved ${allJobs.length} jobs → ${OUTPUT_FILE}`);
}

run();
