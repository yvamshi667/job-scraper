import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeGreenhouse } from "./greenhouse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("🚀 Starting scraper...");

  const companiesPath = path.join(__dirname, "../seeds/greenhouse.us.json");
  const companies = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));

  let allJobs = [];

  for (const company of companies) {
    if (company.ats !== "greenhouse") continue;

    console.log(`🔍 Scraping ${company.name} (greenhouse)`);

    try {
      const jobs = await scrapeGreenhouse(company.greenhouse_company);
      console.log(`✅ ${company.name}: ${jobs.length} jobs`);

      allJobs.push(
        ...jobs.map(j => ({
          ...j,
          company: company.name,
          ats_source: "greenhouse"
        }))
      );
    } catch (err) {
      console.error(`❌ ${company.name} failed`, err.message);
    }
  }

  fs.mkdirSync("output", { recursive: true });
  fs.writeFileSync("output/jobs.json", JSON.stringify(allJobs, null, 2));

  console.log(`📦 Saved ${allJobs.length} jobs → output/jobs.json`);
}

run();
