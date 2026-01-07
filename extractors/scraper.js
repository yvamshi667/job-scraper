// extractors/scraper.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { routeCompany } from "./router.js";
import { ingestJobs } from "./ingestJobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CONFIG
 * Change this if you want a different seed file
 */
const SEED_FILE = path.join(
  __dirname,
  "../seeds/greenhouse-us.json"
);

async function run() {
  console.log("🚀 Starting scraper...");

  // 1️⃣ Load seed file
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`❌ Seed file not found: ${SEED_FILE}`);
  }

  const companies = JSON.parse(
    fs.readFileSync(SEED_FILE, "utf-8")
  );

  if (!Array.isArray(companies)) {
    throw new Error("❌ Seed file must be an array");
  }

  console.log(`🏢 Companies loaded: ${companies.length}`);

  // 2️⃣ Scrape jobs
  let allJobs = [];

  for (const company of companies) {
    try {
      if (!company || !company.name || !company.ats) {
        console.warn("⚠️ Invalid company object", company);
        continue;
      }

      console.log(
        `🔍 Scraping ${company.name} (${company.ats})`
      );

      const jobs = await routeCompany(company);

      console.log(
        `✅ ${company.name}: ${jobs.length} jobs`
      );

      allJobs.push(...jobs);
    } catch (err) {
      console.error(
        `❌ Failed ${company?.name}:`,
        err.message
      );
    }
  }

  // 3️⃣ Save local output (debug / backup)
  const outputDir = path.join(__dirname, "../output");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, "jobs.json");
  fs.writeFileSync(
    outputFile,
    JSON.stringify(allJobs, null, 2)
  );

  console.log(
    `📦 Saved ${allJobs.length} jobs → output/jobs.json`
  );

  // 4️⃣ Ingest into Supabase
  await ingestJobs(allJobs);

  console.log("🎉 Scraping + ingestion complete");
}

// RUN
run().catch((err) => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
