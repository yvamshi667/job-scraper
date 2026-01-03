// extractors/scraper.js
import "dotenv/config";
import { getCompanies, ingestJobs } from "../supabase.js";
import { scrapeCompany } from "./router.js";

const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 200);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  console.log("🚀 Starting job scraper...");

  const companies = await getCompanies();
  console.log(`📦 Companies fetched: ${companies.length}`);

  let totalScraped = 0;

  for (const c of companies) {
    const name = c?.name || "Unknown";
    try {
      console.log(`🔎 Scraping ${name}`);

      const jobs = await scrapeCompany(c);

      if (!Array.isArray(jobs) || jobs.length === 0) {
        console.log(`⚠️ ${name}: 0 jobs`);
        continue;
      }

      totalScraped += jobs.length;

      // ingest in batches (ingest-jobs already dedupes inside)
      for (const b of chunk(jobs, BATCH_SIZE)) {
        await ingestJobs(b);
      }

      console.log(`✅ ${name}: ${jobs.length} jobs`);
    } catch (e) {
      console.log(`❌ ${name} failed: ${String(e?.message || e)}`);
    }
  }

  console.log(`✅ TOTAL jobs scraped: ${totalScraped}`);
}

run().catch((e) => {
  console.error("💥 Scraper crashed:", e);
  process.exit(1);
});
