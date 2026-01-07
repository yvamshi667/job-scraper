import fetch from "node-fetch";

/**
 * Greenhouse scraper
 * Expects:
 * {
 *   name: string,
 *   ats: "greenhouse",
 *   greenhouse_company: string
 * }
 */
export async function greenhouse(company) {
  if (!company.greenhouse_company) {
    console.warn(`⚠️ Missing greenhouse_company for ${company.name}`);
    return [];
  }

  const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_company}/jobs`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Greenhouse API failed for ${company.name}`);
      return [];
    }

    const data = await res.json();

    return (data.jobs || []).map(job => ({
      company: company.name,
      title: job.title,
      location: job.location?.name || "Unknown",
      url: job.absolute_url,
      ats: "greenhouse"
    }));
  } catch (err) {
    console.error(`❌ Greenhouse error for ${company.name}`, err.message);
    return [];
  }
}
