import fs from "fs";
import path from "path";
import scrapeGreenhouse from "./greenhouse.js";
import ingestJobs from "./ingestJobs.js";

const SEED_FILE = path.resolve("seeds/greenhouse-us.json");

async function run() {
  console.log("🚀 Starting scraper...");
  console.log("📂 Using seed:", SEED_FILE);

  // ---- Validate seed file ----
  if (!fs.existsSync(SEED_FILE)) {
    throw new Error(`Seed file not found: ${SEED_FILE}`);
  }

  const companies = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));

  if (!Array.isArray(companies)) {
    throw new Error("Seed file must be an array of companies");
  }

  console.log(`🏢 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    if (
      company.ats !== "greenhouse" ||
      !company.greenhouse_company
    ) {
      continue;
    }

    console.log(`🔍 Scraping ${company.name} (greenhouse)`);

    try {
      const jobs = await scrapeGreenhouse(company.greenhouse_company);

      console.log(`✅ ${company.name}: ${jobs.length} jobs`);

      allJobs.push(
        ...jobs.map(job => ({
          ...job,
          company: company.name,
          ats: "greenhouse"
        }))
      );
    } catch (err) {
      console.warn(`⚠️ Greenhouse API failed for ${company.name}`);
    }
  }

  console.log(`📦 Total jobs scraped: ${allJobs.length}`);

  if (allJobs.length === 0) {
    console.log("⚠️ No jobs to ingest");
    return;
  }

  console.log(`📤 Sending ${allJobs.length} jobs to Supabase`);
  await ingestJobs(allJobs);

  console.log("✅ Scraper finished successfully");
}

run().catch(err => {
  console.error("💥 Scraper crashed:", err.message);
  process.exit(1);
});
