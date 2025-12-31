import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

if (!SUPABASE_URL || !SCRAPER_SECRET_KEY) {
  throw new Error("Supabase env vars missing");
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SCRAPER_SECRET_KEY}`,
};

export async function getCompanies() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?is_active=eq.true`,
    { headers }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load companies: ${text}`);
  }

  return res.json();
}

export async function insertJob(job) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jobs`,
    {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify(job),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Insert failed:", text);
    return false;
  }

  return true;
}
