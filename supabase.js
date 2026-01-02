export async function getCompanies() {
  if (!process.env.GET_COMPANIES_URL) {
    throw new Error("GET_COMPANIES_URL is missing");
  }

  const res = await fetch(process.env.GET_COMPANIES_URL, {
    headers: {
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch companies: ${res.status}`);
  }

  const { companies } = await res.json();
  return companies;
}

export async function sendJobs(jobs) {
  if (!process.env.INGEST_JOBS_URL) {
    throw new Error("INGEST_JOBS_URL is missing");
  }

  const res = await fetch(process.env.INGEST_JOBS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY,
    },
    body: JSON.stringify({ jobs }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
}
