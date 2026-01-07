import fs from "fs";
import path from "path";
import { routeCompany } from "./router.js";
import { ingestJobs } from "./ingestJobs.js";

const SEED_FILE = process.env.SEED_FILE || "seeds/greenhouse-us.json";

async function run() {
  console.log("🚀 Starting scraper...");
  console.log("📂 Using seed:", SEED_FILE);

  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`Seed file not found: ${SEED_FILE}`);
  }

  const companies = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  let allJobs = [];

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name} (${company.ats})`);
    const jobs = await routeCompany(company);
    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  console.log(`📦 Total jobs scraped: ${allJobs.length}`);

  if (allJobs.length > 0) {
    await ingestJobs(allJobs);
  }
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err.message);
  process.exit(1);
});
