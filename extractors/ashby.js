import fetch from "node-fetch";

export default async function scrapeAshby(company) {
  const jobs = [];

  try {
    const res = await fetch(`https://jobs.ashbyhq.com/api/non-user-portal/company/${company.slug}`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.jobs) return [];

    for (const job of data.jobs) {
      jobs.push({
        title: job.title,
        company: company.name,
        location: job.location || "Unknown",
        apply_url: job.applyUrl,
        ats_source: "ashby",
        country: company.country || "US",
      });
    }
  } catch (err) {
    console.error("Ashby error:", company.name, err.message);
  }

  return jobs;
}
