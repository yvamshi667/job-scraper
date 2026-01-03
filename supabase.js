// supabase.js
const REQUIRED = [
  "SUPABASE_FUNCTIONS_BASE_URL",
  "SCRAPER_SECRET_KEY"
];

function assertEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

export async function ingestCompanies(companies) {
  assertEnv();

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-companies`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      },
      body: JSON.stringify({ companies })
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  console.log(`✅ Ingested ${companies.length} companies`);
}

export async function sendJobs(jobs, batchSize = 200) {
  assertEnv();

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    const res = await fetch(
      `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-key": process.env.SCRAPER_SECRET_KEY
        },
        body: JSON.stringify({ jobs: batch })
      }
    );

    if (!res.ok) {
      throw new Error(await res.text());
    }

    console.log(`✅ Sent batch of ${batch.length}`);
  }
}
