// extractors/scraper.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { routeCompany } from "./router.js";
import { ingestJobs } from "./ingestJobs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ SINGLE SOURCE OF TRUTH
const SEED_FILE = path.join(
  __dirname,
  "../seeds/greenhouse.us.json"
);

async function run() {
  try {
    console.log("🚀 Starting scraper...");

    if (!fs.existsSync(SEED_FILE)) {
      throw new Error(`❌ Seed file not found: ${SEED_FILE}`);
    }

    const companies = JSON.parse(
      fs.readFileSync(SEED_FILE, "utf-8")
    );

    if (!Array.isArray(companies)) {
      throw new Error("❌ Seed file is not a JSON array");
    }

    console.log(`🏢 Companies loaded: ${companies.length}`);

    const allJobs = [];

    for (const company of companies) {
      try {
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
          `⚠️ Failed ${company.name}:`,
          err.message
        );
      }
    }

    console.log(
      `📦 Total jobs scraped: ${allJobs.length}`
    );

    if (allJobs.length > 0) {
      await ingestJobs(allJobs);
    }

    console.log("🎉 Scraping complete");
  } catch (err) {
    console.error("💥 Scraper crashed:", err);
    process.exit(1);
  }
}

run();
