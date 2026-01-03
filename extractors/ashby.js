export default async function scrapeAshby(company) {
  const api =
    company.careers_url.replace(/\/$/, "") +
    "?format=json";

  const res = await fetch(api);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data?.jobs) return [];

  const jobs = [];

  for (const team of Object.values(data.jobs)) {
    for (const job of team) {
      jobs.push({
        company: company.name,
        title: job.title,
        url: job.applyUrl,
        location: job.location || "Unknown",
        source: "ashby",
        created_at: new Date().toISOString()
      });
    }
  }

  return jobs;
}
