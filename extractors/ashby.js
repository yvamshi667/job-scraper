export async function scrapeAshby(company) {
  if (!company.careers_url) return [];

  const res = await fetch(company.careers_url);
  if (!res.ok) return [];

  const html = await res.text();

  const matches = [...html.matchAll(/"title":"(.*?)".*?"applyUrl":"(.*?)"/g)];

  return matches.map(m => ({
    title: m[1],
    company: company.name,
    location: null,
    description: null,
    url: m[2],
    country: company.country || "US",
    ats_source: "ashby"
  }));
}
