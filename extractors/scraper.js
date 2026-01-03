// extractors/scraper.js
import { sendJobs } from "../supabase.js";

async function scrapeGreenhouse(slug, company) {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`
  );
  const data = await res.json();

  return data.jobs.map(j => ({
    title: j.title,
    company,
    location: j.location?.name || "US",
    url: j.absolute_url,
    ats_source: "greenhouse",
    posted_at: j.updated_at
  }));
}

console.log("🚀 Starting scraper...");

const targets = [
  { company: "Stripe", slug: "stripe" },
  { company: "Uber", slug: "uber" },
  { company: "Zoom", slug: "zoom" }
];

let allJobs = [];

for (const t of targets) {
  console.log(`🔎 Scraping ${t.company}`);
  const jobs = await scrapeGreenhouse(t.slug, t.company);
  allJobs.push(...jobs);
}

console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);
await sendJobs(allJobs);

console.log("🎉 Scrape completed");
