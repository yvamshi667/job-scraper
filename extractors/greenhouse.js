// extractors/greenhouse.js
export async function scrapeGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_slug}/jobs`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️ ${company.name} Greenhouse returned ${res.status}`);
    return [];
  }

  const data = await res.json();
  if (!Array.isArray(data.jobs)) return [];

  return data.jobs.map(job => ({
    company: company.name,
    company_slug: company.slug,
    title: job.title,
    location: job.location?.name ?? "Unknown",
    url: job.absolute_url,
    source: "greenhouse",
    posted_at: job.updated_at
  }));
}
