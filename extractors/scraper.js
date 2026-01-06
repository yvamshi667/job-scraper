// extractors/scraper.js
import fs from "fs";
import path from "path";
import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./scrapeAshby.js";

const COMPANIES_PATH = path.join(process.cwd(), "companies.json");
const OUT_DIR = path.join(process.cwd(), "output");
const OUT_PATH = path.join(OUT_DIR, "jobs.json");

function loadCompanies() {
  if (!fs.existsSync(COMPANIES_PATH)) {
    console.log("⚠️ companies.json not found. Run discover first.");
    return [];
  }
  const raw = fs.readFileSync(COMPANIES_PATH, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function scrapeCompany(company) {
  const ats = (company.ats || "").toLowerCase();

  if (ats === "ashby" || (company.careers_url || "").includes("jobs.ashbyhq.com")) {
    console.log(`🔎 Scraping ${company.name} (ashby)`);
    return await scrapeAshby(company);
  }

  console.log(`🔎 Scraping ${company.name} (${ats || "generic"})`);
  return await scrapeGeneric(company);
}

async function main() {
  console.log("🚀 Starting scraper...");

  const companies = loadCompanies();
  if (!companies.length) {
    console.log("⚠️ No companies to scrape");
    return;
  }

  const all = [];

  for (const company of companies) {
    try {
      const jobs = await scrapeCompany(company);
      console.log(`✅ ${company.name}: ${jobs.length} jobs/links`);
      for (const j of jobs) all.push(j);
    } catch (e) {
      console.log(`❌ ${company.name} failed: ${e?.message || e}`);
    }
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Dedup by url if present
  const uniq = new Map();
  for (const j of all) {
    const key = j.url || JSON.stringify(j);
    if (!uniq.has(key)) uniq.set(key, j);
  }

  const final = Array.from(uniq.values());
  fs.writeFileSync(OUT_PATH, JSON.stringify(final, null, 2));

  console.log(`📦 Saved ${final.length} records to output/jobs.json`);
  console.log("✅ Scraping complete");
}

main();
