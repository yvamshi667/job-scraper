import { getCompanies, insertJob } from "../supabase.js";
import scrapeCompany from "./scrapeCompany.js";

console.log("========== SCRAPER STARTED ==========");

async function run() {
  // 1️⃣ Load companies
  const companies = await getCompanies();

  console.log("Companies raw value:", companies);
  console.log(
    "Companies loaded count:",
    Array.isArray(companies) ? companies.length : "NOT AN ARRAY"
  );

  // 2️⃣ Hard safety check
  if (!Array.isArray(companies) || companies.length === 0) {
    console.log("EXITING: No companies to scrape");
    console.log("========== SCRAPER FINISHED ==========");
    return;
  }

  let totalFound = 0;
  let totalInserted = 0;
  let totalFailedCompanies = 0;

  // 3️⃣ Scrape each company
  for (const company of companies) {
    console.log(`\n--- Scraping company: ${company.name} ---`);

    try {
      const jobs = await scrapeCompany(company);

      console.log(
        `Jobs found for ${company.name}:`,
        Array.isArray(jobs) ? jobs.length : "INVALID RESPONSE"
      );

      if (!Array.isArray(jobs) || jobs.length === 0) {
        continue;
      }

      totalFound += jobs.length;

      for (const job of jobs) {
        try {
          const inserted = await insertJob(job);
          if (inserted) totalInserted++;
        } catch (err) {
          console.error(
            `Failed inserting job "${job.title}" at ${company.name}:`,
            err.message
          );
        }
      }

      // ⏳ polite delay (anti-block)
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      totalFailedCompanies++;
      console.error(
        `ERROR scraping ${company.name}:`,
        err.message || err
      );
    }
  }

  // 4️⃣ FINAL SUMMARY (THIS IS WHAT YOU WANT TO SEE)
  console.log("\n========== SCRAPER SUMMARY ==========");
  console.log(`Companies processed: ${companies.length}`);
  console.log(`Companies failed: ${totalFailedCompanies}`);
  console.log(`Total jobs found: ${totalFound}`);
  console.log(`Total new jobs inserted: ${totalInserted}`);

  if (totalFound === 0) {
    console.log(
      "NOTE: No jobs were found on company career pages during this run."
    );
  } else if (totalInserted === 0) {
    console.log(
      "NOTE: Jobs were found, but all were already ingested (dedup working)."
    );
  }

  console.log("========== SCRAPER FINISHED ==========");
}

// Run safely
run().catch((err) => {
  console.error("FATAL SCRAPER ERROR:", err);
  process.exit(1);
});
