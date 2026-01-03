// ❌ DO NOT import node-fetch
// Node 20 already has global fetch

export async function scrapeGreenhouse(company) {
  if (!company.careers_url) return [];

  const slug = company.careers_url.split("/").pop();
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data.jobs)) return [];

  return data.jobs.map(job => ({
    title: job.title,
    company: company.name,
    location: job.location?.name || null,
    description: job.content || null,
    url: job.absolute_url,
    country: company.country || "US",
    ats_source: "greenhouse"
  }));
}
