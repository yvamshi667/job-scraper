export async function scrapeAshby(company) {
  const url = `https://jobs.ashbyhq.com/api/non-user-facing/company/${company.slug}/jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  const jobs = json.jobs || [];

  return jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location || "Unknown",
    country: company.country || "US",
    url: `https://jobs.ashbyhq.com/${company.slug}/${job.id}`,
    source: "ASHBY"
  }));
}
