// extractors/scraper.js
import { routeSource } from "./router.js";
import { ingestJobs } from "./ingestJobs.js";

async function run() {
  console.log("🚀 Starting scraper...");

  // 🔥 Run GitHub TODAY
  const githubJobs = await routeSource("github");
  await ingestJobs(githubJobs);

  console.log(`📦 Ingested ${githubJobs.length} GitHub jobs`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
