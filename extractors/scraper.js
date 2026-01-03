// extractors/scraper.js
import { sendJobs } from "../supabase.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

async function run() {
  console.log("🚀 Starting scraper...");

  const companies = [
    { name: "Stripe", careers_url: "https://stripe.com/jobs", ats: "greenhouse" },
    { name: "Zoom", careers_url: "https://careers.zoom.us", ats: "generic" },
    { name: "Uber", careers_url: "https://www.uber.com/us/en/careers/", ats: "generic" },
  ];

  let allJobs = [];

  for (const company of companies) {
    console.log(`🔎 Scraping ${company.name}`);

    let jobs = [];

    if (company.ats === "greenhouse") {
      jobs = await scrapeGreenhouse(company);
    } else if (company.ats === "ashby") {
      jobs = await scrapeAshby(company);
    } else {
      jobs = await scrapeGeneric(company);
    }

    allJobs.push(...jobs);
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

  if (allJobs.length === 0) {
    console.log("⚠️ No jobs found, skipping ingestion");
    return;
  }

  await sendJobs(allJobs);

  console.log("🎉 Scrape completed successfully");
}

run().catch((err) => {
  console.error("💥 Scraper crashed:", err);
  process.exit(1);
});
