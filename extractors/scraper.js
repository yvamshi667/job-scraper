// extractors/scraper.js
import fetch from "node-fetch";
import { scrapeCompany } from "./router.js";

/**
 * ENV VARS REQUIRED (GitHub Actions secrets):
 *
 * SCRAPER_SECRET_KEY
 * SUPABASE_URL
 *
 * Lovable provides SUPABASE_SERVICE_ROLE_KEY automatically
 * inside edge functions — NOT needed here.
 */

const COMPANIES_ENDPOINT = `${process.env.SUPABASE_URL}/functions/v1/get-companies`;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

if (!SCRAPER_KEY || !process.env.SUPABASE_URL) {
  console.error("❌ Missing required env vars");
  process.exit(1);
}

async function getCompanies() {
  const res = await fetch(COMPANIES_ENDPOINT, {
    method: "GET",
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch companies (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.companies || [];
}

async function runScraper() {
  console.log("🚀 Starting job scraper...");

  let companies;
  try {
    companies = await getCompanies();
  } catch (err) {
    console.error("❌ Error fetching companies:", err.message);
    process.exit(1);
  }

  console.log(`🏢 Companies fetched: ${companies.length}`);

  if (companies.length === 0) {
    console.warn("⚠️ No companies found — exiting");
    return;
  }

  const allJobs = [];

  // IMPORTANT: for...of (NOT forEach)
  for (const company of companies) {
    try {
      console.log(`🔎 Scraping ${company.name}`);
      const jobs = await scrapeCompany(company);

      if (Array.isArray(jobs) && jobs.length > 0) {
        allJobs.push(...jobs);
        console.log(`✅ ${company.name}: ${jobs.length} jobs`);
      } else {
        console.log(`⚠️ ${company.name}: 0 jobs`);
      }
    } catch (err) {
      console.error(`❌ ${company.name} failed:`, err.message);
    }
  }

  console.log(`🎯 TOTAL jobs scraped: ${allJobs.length}`);
}

runScraper().catch((err) => {
  console.error("❌ Fatal scraper error:", err);
  process.exit(1);
});
