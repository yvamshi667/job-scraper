import fetch from "node-fetch";

function assertEnv() {
  const required = [
    "SUPABASE_FUNCTIONS_BASE_URL",
    "SCRAPER_SECRET_KEY"
  ];
  const missing = required.filter(v => !process.env[v]);
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
    throw new Error(`ingest-companies failed ${res.status}`);
  }

  return res.json();
}

export async function getCompanies() {
  assertEnv();

  const res = await fetch(
    `${process.env.SUPABASE_FUNCTIONS_BASE_URL}/get-companies`,
    {
      headers: {
        "x-scraper-key": process.env.SCRAPER_SECRET_KEY
      }
    }
  );

  if (!res.ok) {
    throw new Error(`get-companies failed ${res.status}`);
  }

  return res.json();
}

export async function sendJobs(jobs) {
  assertEnv();

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

  return res.json();
}
