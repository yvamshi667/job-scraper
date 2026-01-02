// extractors/scraper.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_FILES = [
  path.resolve(__dirname, "../data/companies.json"),
  path.resolve(__dirname, "../companies.json"),
];

function loadCompanies() {
  for (const file of COMPANY_FILES) {
    if (fs.existsSync(file)) {
      console.log(`📦 Loaded companies from ${file}`);
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
  }
  throw new Error("❌ companies.json not found");
}

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = loadCompanies();
  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      const jobs = await scrapeCompany(company);
      console.log(`➡️ ${company.name}: ${jobs.length} jobs`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`❌ ${company.name} failed:`, err.message);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
  await sendJobs(allJobs);
}

run().catch(err => {
  console.error("🔥 Scraper crashed:", err.message);
  process.exit(1);
});
