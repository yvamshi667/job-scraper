import fetch from "node-fetch";

export default async function scrapeGreenhouse(company) {
  const jobs = [];
  const url = company.careers_url;

  try {
    const res = await fetch(`https://${url}/jobs.json`);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.jobs) return [];

    for (const job of data.jobs) {
      jobs.push({
        title: job.title,
        company: company.name,
        location: job.location?.name || "Unknown",
        apply_url: job.absolute_url,
        ats_source: "greenhouse",
        country: company.country || "US",
      });
    }
  } catch (err) {
    console.error("Greenhouse error:", company.name, err.message);
  }

  return jobs;
}
