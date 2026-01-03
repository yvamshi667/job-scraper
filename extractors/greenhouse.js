export async function scrapeGreenhouse(company) {
  if (!company.careers_url) return [];

  const token = company.careers_url.split("/").pop();
  const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data.jobs)) return [];

  return data.jobs.map(j => ({
    title: j.title,
    company: company.name,
    location: j.location?.name || null,
    description: j.content || null,
    url: j.absolute_url,
    country: company.country || "US",
    ats_source: "greenhouse"
  }));
}
