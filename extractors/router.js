import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

/**
 * HARD-CODED WORKDAY ENDPOINTS (RELIABLE)
 */
const WORKDAY_ENDPOINTS = {
  Uber: "https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/External/jobs",
  Zoom: "https://zoom.wd5.myworkdayjobs.com/wday/cxs/zoom/ZoomCareers/jobs"
};

/**
 * WORKDAY SCRAPER (FINAL)
 */
async function scrapeWorkday(company) {
  const url = WORKDAY_ENDPOINTS[company.name];

  if (!url) {
    console.warn(`⚠️ No Workday mapping for ${company.name}`);
    return [];
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ ${company.name} returned ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json?.jobPostings || [];

    return jobs.map(j => ({
      company: company.name,
      title: j.title,
      location:
        j.locations?.[0]?.displayName ||
        j.primaryLocation?.displayName ||
        "Unknown",
      apply_url: j.externalPath
        ? `https://${new URL(url).host}${j.externalPath}`
        : null,
      source: "workday"
    }));
  } catch (err) {
    console.error(`❌ Workday scrape failed for ${company.name}`, err);
    return [];
  }
}

/**
 * GREENHOUSE SCRAPER
 */
async function scrapeGreenhouse(company) {
  if (!company.greenhouse_id) {
    console.warn(`⚠️ No greenhouse_id for ${company.name}`);
    return [];
  }

  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_id}/jobs`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    return (json.jobs || []).map(j => ({
      company: company.name,
      title: j.title,
      location: j.location?.name || "Unknown",
      apply_url: j.absolute_url,
      source: "greenhouse"
    }));
  } catch {
    return [];
  }
}

/**
 * ROUTER (FINAL)
 */
export default async function routeScraper(company) {
  console.log(`🔎 Scraping ${company.name}`);

  switch (company.ats) {
    case "workday":
      return await scrapeWorkday(company);

    case "greenhouse":
      return await scrapeGreenhouse(company);

    case "ashby":
      return await scrapeAshby(company);

    default:
      return await scrapeGeneric(company);
  }
}
