import fetch from "node-fetch";

/**
 * Scrape jobs from Greenhouse public API
 * @param {object} company
 * @returns {Array}
 */
export default async function scrapeGreenhouse(company) {
  const jobs = [];

  if (!company.greenhouse_company) {
    return jobs;
  }

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_company}/jobs`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!res.ok) return jobs;

    const data = await res.json();
    if (!data.jobs) return jobs;

    for (const job of data.jobs) {
      jobs.push({
        company: company.name,
        title: job.title,
        location: job.location?.name || "Unknown",
        url: job.absolute_url,
        ats: "greenhouse",
        scraped_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error(`❌ Greenhouse error for ${company.name}`, err.message);
  }

  return jobs;
}
