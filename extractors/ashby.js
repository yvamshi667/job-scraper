import fetch from "node-fetch";

export async function scrapeAshby(company) {
  try {
    const res = await fetch(company.careers_url);
    const html = await res.text();

    const match = html.match(/__ASHBY_JOBS__\s*=\s*(\{.*?\});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);

    return (data.jobs || []).map(job => ({
      title: job.title,
      company: company.name,
      location: job.location || "Unknown",
      url: job.url,
      ats_source: "ashby",
      is_direct: true,
      is_active: true,
    }));
  } catch {
    return [];
  }
}
