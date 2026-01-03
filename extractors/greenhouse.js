export default async function scrapeGreenhouse(company) {
  const api = company.careers_url
    .replace(/\/jobs\/?$/, "")
    .replace(/\/$/, "") + "/jobs.json";

  const res = await fetch(api);
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data.jobs)) return [];

  return data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    url: job.absolute_url,
    location: job.location?.name || "Unknown",
    source: "greenhouse",
    created_at: new Date().toISOString()
  }));
}
