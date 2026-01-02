// extractors/scraper.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeCompany } from "./router.js";
import { sendJobs } from "../supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const companies = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../companies.json"), "utf-8")
);

console.log("🚀 Starting job scraper...");
let allJobs = [];

for (const company of companies) {
  const jobs = await scrapeCompany(company);
  console.log(`🔎 Scraping ${company.name} → ${jobs.length}`);
  allJobs.push(...jobs);
}

console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);
await sendJobs(allJobs);
