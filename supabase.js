function assertEnv(keys) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

export async function getCompanies() {
  assertEnv(["SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY"]);

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/get-companies`,
    {
      headers: {
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      }
    }
  );

  return await res.json();
}

export async function sendJobs(jobs) {
  assertEnv(["SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY"]);

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/ingest-jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      },
      body: JSON.stringify({ jobs })
    }
  );

  if (!res.ok) {
    throw new Error(`ingest-jobs failed ${res.status}`);
  }
}
