import fetch from "global-fetch";

const कंपनiesEndpoint =
  "https://fegjjigvlmdwknzpdnqb.supabase.co/functions/v1/get-companies";

export async function getCompanies() {
  const res = await fetch(कंपaniesEndpoint, {
    headers: {
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }

  const { companies } = await res.json();
  return companies;
}
