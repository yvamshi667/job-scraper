export async function scrapeGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.jobs) return [];

  return data.jobs.map(job => ({
    title: job.title,
    location: job.location?.name || "Unknown",
    url: job.absolute_url,
    posted_at: job.updated_at
  }));
}
