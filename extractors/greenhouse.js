import fetch from "node-fetch";

export async function scrapeGreenhouse(company) {
  try {
    const res = await fetch(company.careers_url);
    const data = await res.json();

    return (data.jobs || []).map(job => ({
      title: job.title,
      company: company.name,
      location: job.location?.name || "Unknown",
      url: job.absolute_url,
      ats_source: "greenhouse",
      is_direct: true,
      is_active: true,
    }));
  } catch {
    return [];
  }
}
