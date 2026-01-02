// extractors/lever.js
import fetch from "node-fetch";

export async function scrapeLever(company) {
  try {
    const res = await fetch(company.url);
    const data = await res.json();

    return data.map(job => ({
      title: job.text,
      location: job.categories?.location || "Unknown",
      company: company.name,
      url: job.hostedUrl,
      ats_source: "lever",
      is_direct: true,
      is_active: true,
    }));
  } catch {
    return [];
  }
}
