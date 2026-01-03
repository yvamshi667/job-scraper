// extractors/scraper.js
import { sendJobs } from "../supabase.js";

async function scrapeGreenhouse(slug, company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "job-scraper/1.0" } });
  } catch (e) {
    console.error(`❌ Network error for ${company}`);
    return [];
  }

  if (!res.ok) {
    console.warn(`⚠️ ${company} returned ${res.status}`);
    return [];
  }

  let data;
  try {
    data = await res.json();
  } catch {
    console.warn(`⚠️ Invalid JSON for ${company}`);
    return [];
  }

  // ✅ Support both Greenhouse response formats
  const jobsArray =
    Array.isArray(data.jobs)
      ? data.jobs
      : Array.isArray(data.data)
      ? data.data
      : [];

  if (!jobsArray.length) {
    console.warn(`⚠️ No jobs found for ${company}`);
    return [];
  }

  return jobsArray.map(j => ({
    title: j.title || "Unknown role",
    company,
    location: j.location?.name || "US",
    url: j.absolute_url || j.url,
    ats_source: "greenhouse",
    posted_at: j.updated_at || new Date().toISOString()
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
  console.log(`➡️ Found ${jobs.length} jobs`);
  allJobs.push(...jobs);
}

console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

if (allJobs.length === 0) {
  console.warn("⚠️ No jobs scraped — skipping ingestion");
  process.exit(0);
}

await sendJobs(allJobs);

console.log("🎉 Scrape completed successfully");
