// extractors/scraper.js
import { getCompanies, sendJobs } from "../supabase.js";
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

const COUNTRY = (process.env.SCRAPE_COUNTRY || "US").toUpperCase();
const LIMIT = Number(process.env.SCRAPE_COMPANY_LIMIT || 200);
const BATCH_SIZE = Number(process.env.SCRAPE_BATCH_SIZE || 200);

async function run() {
  console.log("🚀 Starting job scraper...");

  const companiesResp = await getCompanies({ country: COUNTRY, limit: LIMIT });
  const companies = Array.isArray(companiesResp?.companies) ? companiesResp.companies : companiesResp;

  console.log(`🏢 Companies fetched: ${companies.length}`);

  let allJobs = [];
  for (const c of companies) {
    const ats = (c.ats_source || "generic").toLowerCase();
    const url = c.careers_url;

    console.log(`🔎 Scraping ${c.name} (${ats})`);

    let jobs = [];
    try {
      if (ats === "greenhouse") jobs = await scrapeGreenhouse(url, c);
      else if (ats === "lever") jobs = await scrapeLever(url, c);
      else if (ats === "ashby") jobs = await scrapeAshby(url, c);
      else jobs = await scrapeGeneric(url, c);
    } catch (e) {
      console.log(`❌ ${c.name} failed: ${String(e).slice(0, 200)}`);
      continue;
    }

    allJobs.push(...jobs);
  }

  console.log(`📦 TOTAL jobs scraped: ${allJobs.length}`);

  // send in batches
  let sent = 0;
  let batchNo = 0;
  for (let i = 0; i < allJobs.length; i += BATCH_SIZE) {
    const batch = allJobs.slice(i, i + BATCH_SIZE);
    batchNo += 1;
    await sendJobs(batch);
    sent += batch.length;
    console.log(`✅ Batch ${batchNo} sent (${batch.length})`);
  }

  console.log(`✅ Done. Total jobs sent: ${sent}`);
}

run().catch((e) => {
  console.error("💥 Scraper crashed:", e);
  process.exit(1);
});
