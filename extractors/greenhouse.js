export async function scrapeGreenhouse(company) {
  const api = `${company.careers_url}/jobs.json`;
  const res = await fetch(api);
  if (!res.ok) return [];

  const json = await res.json();

  return json.jobs.map(j => ({
    title: j.title,
    company: company.name,
    location: j.location?.name || null,
    url: j.absolute_url,
    country: company.country || "US",
    ats_source: "greenhouse"
  }));
}
