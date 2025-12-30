import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export async function getCompanies() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    { headers: { apikey: SUPABASE_KEY } }
  );
  return res.json();
}

export async function insertJob(job) {
  await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates"
    },
    body: JSON.stringify(job)
  });
}
