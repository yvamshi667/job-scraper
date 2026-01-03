export async function scrapeAshby(company) {
  const api = `${company.careers_url}?format=json`;
  const res = await fetch(api);
  if (!res.ok) return [];

  const json = await res.json();

  return (json.jobs || []).map(j => ({
    title: j.title,
    company: company.name,
    location: j.location || null,
    url: j.jobUrl,
    country: company.country || "US",
    ats_source: "ashby"
  }));
}
