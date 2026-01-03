// extractors/greenhouse.js
// Node 18+ has native fetch — DO NOT import node-fetch

export async function scrapeGreenhouse(company) {
  const boardToken = company.greenhouse_token;
  if (!boardToken) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`❌ Greenhouse failed for ${company.name}`);
    return [];
  }

  const data = await res.json();
  if (!Array.isArray(data.jobs)) return [];

  return data.jobs.map(job => ({
    title: job.title,
    company: company.name,
    location: job.location?.name || null,
    description: job.content || null,
    url: job.absolute_url,
    ats_source: "greenhouse",
    country: company.country || "US",
  }));
}
