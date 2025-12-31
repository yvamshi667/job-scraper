// extractors/scraper.js
import { routeATS } from "./router.js";
import { sendJobs } from "../supabase.js";
import fetch from "node-fetch";

const COMPANIES_ENDPOINT =
  `${process.env.SUPABASE_URL}/rest/v1/companies?active=eq.true`;

async function getCompanies() {
  const res = await fetch(COMPANIES_ENDPOINT, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }

  return res.json();
}

(async function runScraper() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  console.log(`📦 Companies loaded: ${companies.length}`);

  let allJobs = [];

  for (const company of companies) {
    try {
      const jobs = await routeATS(company);

      if (!jobs || jobs.length === 0) {
        console.log(`🔍 ${company.name}: Found 0 jobs`);
        continue;
      }

      console.log(`🔍 ${company.name}: Found ${jobs.length} jobs`);
      allJobs.push(...jobs); // ✅ FIX: APPEND, DON’T OVERWRITE
    } catch (err) {
      console.error(`❌ Error scraping ${company.name}`, err);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${allJobs.length}`);

  if (allJobs.length === 0) {
    console.warn("⚠️ No jobs scraped. Exiting.");
    return;
  }

  await sendJobs(allJobs);

  console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
})();
