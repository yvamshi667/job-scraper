export async function scrapeLever(company) {
  if (!company.careers_url) return [];

  const url = `${company.careers_url}?mode=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const jobs = await res.json();
  if (!Array.isArray(jobs)) return [];

  return jobs.map(j => ({
    title: j.text,
    company: company.name,
    location: j.categories?.location || null,
    description: j.description || null,
    url: j.hostedUrl,
    country: company.country || "US",
    ats_source: "lever"
  }));
}
