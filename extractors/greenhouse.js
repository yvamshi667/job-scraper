export default async function scrapeGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.jobs) return [];

  return data.jobs.map(job => ({
    title: job.title,
    company: company.name,
    location: job.location?.name || "Remote",
    url: job.absolute_url,
    description: job.content || "",
    ats_source: "greenhouse",
    country: company.country || "US",
    is_active: true,
    is_direct: true
  }));
}
