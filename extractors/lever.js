export async function scrapeLever(company) {
  if (!company.careers_url) return [];

  const res = await fetch(`${company.careers_url}?mode=json`);
  if (!res.ok) return [];

  const jobs = await res.json();
  if (!Array.isArray(jobs)) return [];

  return jobs.map(job => ({
    title: job.text,
    company: company.name,
    location: job.categories?.location || null,
    description: job.description || null,
    url: job.hostedUrl,
    country: company.country || "US",
    ats_source: "lever"
  }));
}
