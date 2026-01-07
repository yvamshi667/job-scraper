import fs from "fs";
import { routeCompany } from "./router.js";

const BATCH_FILE = process.env.BATCH_FILE || "seeds/greenhouse-batch-001.json";

console.log("🚀 Starting scraper with:", BATCH_FILE);

const companies = JSON.parse(fs.readFileSync(BATCH_FILE, "utf-8"));
const results = [];

for (const company of companies) {
  try {
    const jobs = await routeCompany(company);
    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    results.push(...jobs);
  } catch (err) {
    console.warn(`⚠️ Failed ${company.name}`);
  }
}

fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(
  "output/jobs.json",
  JSON.stringify(results, null, 2)
);

console.log(`📦 Saved ${results.length} jobs`);
