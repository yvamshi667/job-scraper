import fetch from "node-fetch";

export default async function scrapeGreenhouse(company) {
  const jobs = [];
  let base = company.careers_url?.trim();
  if (!base) return [];

  // If the careers_url doesn't include a protocol, assume https and build a proper base.
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base.replace(/^\/+/, "")}`;
  } else {
    // remove trailing slash for consistent concatenation
    base = base.replace(/\/+$/, "");
  }

  try {
    const res = await fetch(`${base}/jobs.json`);
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
