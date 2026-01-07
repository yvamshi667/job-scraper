export async function scrapeGreenhouse(company) {
  const slug = company.greenhouse_company;
  if (!slug) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`⚠️ Greenhouse failed for ${company.name}`);
    return [];
  }

  const data = await res.json();
  if (!data.jobs) return [];

  return data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location?.name || "Unknown",
    url: job.absolute_url,
    ats: "greenhouse"
  }));
}
