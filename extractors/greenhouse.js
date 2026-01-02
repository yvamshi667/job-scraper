// extractors/greenhouse.js
import fetch from "node-fetch";

export async function scrapeGreenhouse(company) {
  try {
    const res = await fetch(company.url);
    const data = await res.json();

    return (data.jobs || []).map(job => ({
      title: job.title,
      location: job.location?.name || "Unknown",
      company: company.name,
      url: job.absolute_url,
      ats_source: "greenhouse",
      is_direct: true,
      is_active: true,
    }));
  } catch {
    return [];
  }
}
