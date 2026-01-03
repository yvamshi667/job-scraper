import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

/**
 * HARD-MAPPED WORKDAY ENDPOINTS
 * (Workday WILL NOT work without tenant names)
 */
const WORKDAY_ENDPOINTS = {
  Uber: "https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/External/jobs",
  Zoom: "https://zoom.wd5.myworkdayjobs.com/wday/cxs/zoom/ZoomCareers/jobs"
};

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
    const jobs = json.jobPostings || [];

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
    console.error(`❌ Workday failed for ${company.name}`, err);
    return [];
  }
}

async function scrapeGreenhouse(company) {
  if (!company.greenhouse_id) return [];

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

export default async function routeScraper(company) {
  console.log(`🔎 Scraping ${company.name}`);

  if (company.name === "Uber" || company.name === "Zoom") {
    return await scrapeWorkday(company);
  }

  switch (company.ats) {
    case "greenhouse":
      return await scrapeGreenhouse(company);
    case "ashby":
      return await scrapeAshby(company);
    default:
      return await scrapeGeneric(company);
  }
}
