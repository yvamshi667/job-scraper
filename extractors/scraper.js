import { getCompanies, insertJob } from "../supabase.js";
import routeScraper from "./router.js";

console.log("ENV CHECK:", {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  SCRAPER_SECRET_KEY: !!process.env.SCRAPER_SECRET_KEY,
});

const companies = await getCompanies();

console.log(`Companies loaded: ${companies.length}`);

let totalFound = 0;
let totalInserted = 0;

for (const company of companies) {
  console.log(`🔎 Scraping ${company.name}`);

  const jobs = await routeScraper(company);
  totalFound += jobs.length;

  for (const job of jobs) {
    const inserted = await insertJob(job);
    if (inserted) totalInserted++;
  }
}

console.log(`✅ SUMMARY: Found ${totalFound} jobs, Inserted ${totalInserted}`);
