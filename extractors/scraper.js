import { scrapeCompany } from "./router.js";
import { getCompanies } from "../supabase.js";

console.log("🚀 Scraper started");

const companies = await getCompanies();

console.log(`🏢 Companies loaded: ${companies.length}`);

if (!companies.length) {
  console.log("❌ No companies returned from Supabase");
  process.exit(0);
}

let totalFound = 0;
let totalInserted = 0;

for (const company of companies) {
  console.log(`\n🔹 Scraping ${company.name}`);
  const jobs = await scrapeCompany(company);

  console.log(`➡️ ${company.name}: ${jobs.length} jobs found`);
  totalFound += jobs.length;

  for (const job of jobs) {
    // insertion happens inside scrapeCompany OR supabase helper
    totalInserted++;
  }
}

console.log(
  `\n✅ SUMMARY: Found ${totalFound} jobs | Processed ${companies.length} companies`
);
