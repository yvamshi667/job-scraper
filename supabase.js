// supabase.js

function assertEnv(...keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `❌ Missing env vars: ${missing.join(", ")}`
    );
  }
}

export async function ingestJobs(jobs) {
  assertEnv(
    "SUPABASE_FUNCTIONS_BASE_URL",
    "SCRAPER_SECRET_KEY"
  );

  const url =
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ jobs })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `❌ ingest-jobs failed ${res.status}: ${text}`
    );
  }

  console.log("📥 Jobs ingested successfully");
}
