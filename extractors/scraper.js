import fs from "fs";
import scrapeGreenhouse from "./scrapeGreenhouse.js";
import scrapeGeneric from "./scrapeGeneric.js";

const COMPANIES_FILE = "companies.json";
const OUTPUT_FILE = "output/jobs.json";

async function runScraper() {
  console.log("🚀 Starting scraper...");

  if (!fs.existsSync(COMPANIES_FILE)) {
    console.warn("⚠️ companies.json not found. Run discover first.");
    return;
  }

  const companies = JSON.parse(fs.readFileSync(COMPANIES_FILE, "utf-8"));
  const allJobs = [];

  for (const company of companies) {
    console.log(`🔍 Scraping ${company.name} (${company.ats})`);

    let jobs = [];

    if (company.ats === "greenhouse") {
      jobs = await scrapeGreenhouse(company);
    } else {
      jobs = await scrapeGeneric(company);
    }

    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    allJobs.push(...jobs);
  }

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allJobs, null, 2));

  console.log(`🎉 Saved ${allJobs.length} jobs to ${OUTPUT_FILE}`);
}

runScraper();
