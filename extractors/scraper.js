import { routeScraper } from "./router.js";
import { sendJobs } from "../supabase.js";

console.log("🚀 Starting scraper...");

const COMPANIES = [
  { name: "Stripe", careers_url: "https://stripe.com/jobs", ats: "generic" },
  { name: "Zoom", careers_url: "https://careers.zoom.us/jobs", ats: "generic" },
  { name: "Uber", careers_url: "https://www.uber.com/us/en/careers/list/", ats: "generic" }
];

const BATCH_SIZE = 200;
let allJobs = [];

for (const company of COMPANIES) {
  console.log(`🔎 Scraping ${company.name}`);
  const jobs = await routeScraper(company);
  allJobs.push(...jobs);
}

console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
  const batch = allJobs.slice(i, i + BATCH_SIZE);
  await sendJobs(batch);
  console.log(`✅ Batch ${i / BATCH_SIZE + 1} sent (${batch.length})`);
}

console.log("🎉 Scrape completed");
