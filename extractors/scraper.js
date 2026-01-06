import fs from "fs";
import routeScraper from "./router.js";
import { sendJobs } from "../supabase.js";

console.log("🚀 Starting scraper...");

if (!fs.existsSync("companies.json")) {
  console.log("⚠️ companies.json not found. Run discover first.");
  process.exit(0);
}

const companies = JSON.parse(fs.readFileSync("companies.json", "utf-8"));

if (!Array.isArray(companies) || companies.length === 0) {
  console.log("⚠️ No companies to scrape");
  process.exit(0);
}

let allJobs = [];

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);
  const jobs = await routeScraper(company);
  console.log(`📦 Found ${jobs.length} jobs`);
  allJobs.push(...jobs);
}

console.log(`🎯 TOTAL jobs scraped: ${allJobs.length}`);

await sendJobs(allJobs);

console.log("🎉 Scrape completed successfully");
