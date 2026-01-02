// supabase.js
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SCRAPER_KEY = process.env.SCRAPER_SECRET_KEY;

if (!SUPABASE_URL || !SCRAPER_KEY) {
  console.error("❌ Missing required env vars");
  process.exit(1);
}

const COMPANIES_ENDPOINT =
  `${SUPABASE_URL}/functions/v1/get-companies`;

export async function getCompanies() {
  const res = await fetch(COMPANIES_ENDPOINT, {
    headers: {
      "x-scraper-key": SCRAPER_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch companies: ${text}`);
  }

  const { companies } = await res.json();
  return companies || [];
}
