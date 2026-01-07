import fs from "fs";
import { routeCompany } from "./router.js";

// ✅ THIS FILE EXISTS
const BATCH_FILE = "seeds/greenhouse.us.json";

console.log("🚀 Starting scraper...");
console.log("📂 Batch file:", BATCH_FILE);

async function run() {
  if (!fs.existsSync(BATCH_FILE)) {
    console.error("❌ Available seed files:");
    console.error(fs.readdirSync("seeds"));
    throw new Error(`Seed file not found: ${BATCH_FILE}`);
  }

  const companies = JSON.parse(
    fs.readFileSync(BATCH_FILE, "utf-8")
  );

  if (!Array.isArray(companies)) {
    throw new Error("Seed file is not a JSON array");
  }

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

run().catch(err => {
  console.error("💥 Scraper crashed:", err.message);
  process.exit(1);
});
