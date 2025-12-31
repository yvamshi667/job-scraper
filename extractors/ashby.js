import fetch from "node-fetch";

export default async function scrapeAshby(company) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company.slug}?includeCompensation=true`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.jobs) return [];

  return data.jobs.map(job => ({
    title: job.title,
    company: company.name,
    location: job.location?.name || "Remote",
    url: job.jobUrl,
    description: job.descriptionHtml || "",
    ats_source: "ashby",
    country: company.country || "US",
    is_active: true,
    is_direct: true
  }));
}
