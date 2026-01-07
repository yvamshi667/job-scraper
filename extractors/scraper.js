// extractors/scraper.js
import fs from "fs";
import { routeCompany } from "./router.js";
import { ingestJobs } from "./ingestJobs.js";

const SEED_FILE = "seeds/greenhouse-us.json";

async function run() {
  console.log("🚀 Starting scraper...");
  console.log(`📂 Using seed file: ${SEED_FILE}`);

  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`Seed file not found: ${SEED_FILE}`);
  }

  const companies = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name} (${company.ats})`);
    const jobs = await routeCompany(company);
    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  await ingestJobs(allJobs);

  console.log(`📦 Saved ${allJobs.length} jobs`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
