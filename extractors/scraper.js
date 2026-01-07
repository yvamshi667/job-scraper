import fs from "fs";
import { routeCompany } from "./router.js";

const BATCH_FILE = "seeds/greenhouse-us.json"; // ✅ EXISTING FILE

console.log("🚀 Starting scraper...");
console.log("📂 Batch file:", BATCH_FILE);

async function run() {
  if (!fs.existsSync(BATCH_FILE)) {
    throw new Error(`Seed file not found: ${BATCH_FILE}`);
  }

  const companies = JSON.parse(fs.readFileSync(BATCH_FILE, "utf-8"));
  const allJobs = [];

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name} (${company.ats})`);
    const jobs = await routeCompany(company);
    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync(
    "output/jobs.json",
    JSON.stringify(allJobs, null, 2)
  );

  console.log(`📦 Saved ${allJobs.length} jobs → output/jobs.json`);
}

run();
