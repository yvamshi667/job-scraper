// supabase.js
import fetch from "node-fetch";

/**
 * Required ENV vars:
 * - SUPABASE_FUNCTIONS_BASE_URL
 * - SCRAPER_SECRET_KEY
 */
function assertEnv() {
  const required = ["SUPABASE_FUNCTIONS_BASE_URL", "SCRAPER_SECRET_KEY"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }
}

/**
 * Ingest discovered companies
 */
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
    const text = await res.text();
    throw new Error(`ingest-companies failed ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Fetch companies to scrape
 */
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
    const text = await res.text();
    throw new Error(`get-companies failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Ingest scraped jobs
 */
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
    const text = await res.text();
    throw new Error(`ingest-jobs failed ${res.status}: ${text}`);
  }

  return res.json();
}
