// supabase.js
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SCRAPER_SECRET_KEY) {
  throw new Error("Supabase env vars missing");
}

const INGEST_ENDPOINT = `${SUPABASE_URL}/functions/v1/ingest-jobs`;

export async function sendJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    console.warn("⚠️ sendJobs called with 0 jobs");
    return;
  }

  console.log(`🚀 Sending ${jobs.length} jobs in batches of 200`);

  const BATCH_SIZE = 200;
  let sent = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    try {
      const res = await fetch(INGEST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "x-scraper-key": SCRAPER_SECRET_KEY
        },
        body: JSON.stringify(batch)
      });

      const text = await res.text();

      if (!res.ok) {
        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed`, text);
        continue;
      }

      sent += batch.length;
      console.log(`✅ Sent batch ${i / BATCH_SIZE + 1} (${batch.length} jobs)`);
    } catch (err) {
      console.error(`❌ Batch ${i / BATCH_SIZE + 1} crashed`, err);
    }
  }

  console.log(`🎉 Finished sending jobs. Total sent: ${sent}`);
}
