import fetch from "node-fetch";

export async function scrapeGreenhouse(company) {
  const api = `${company.careers_url}/jobs?content=true`;

  const res = await fetch(api);
  if (!res.ok) return [];

  const data = await res.json();

  return data.jobs.map(j => ({
    title: j.title,
    company: company.name,
    country: company.country || "US",
    url: j.absolute_url,
    source: "greenhouse"
  }));
}
