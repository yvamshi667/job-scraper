import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

/**
 * WORKDAY SCRAPER
 */
async function scrapeWorkday(company) {
  if (!company.workday_url) {
    console.warn(`⚠️ No workday_url for ${company.name}`);
    return [];
  }

  try {
    const res = await fetch(company.workday_url);
    if (!res.ok) {
      console.warn(`⚠️ ${company.name} returned ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json?.jobPostings || json?.jobs || [];

    return jobs.map(j => ({
      company: company.name,
      title: j.title,
      location: j.locations?.[0]?.displayName || "Unknown",
      apply_url: j.externalPath
        ? `https://${new URL(company.workday_url).host}${j.externalPath}`
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

    if (!res.ok) {
      console.warn(`⚠️ ${company.name} returned ${res.status}`);
      return [];
    }

    const json = await res.json();
    const jobs = json.jobs || [];

    return jobs.map(j => ({
      company: company.name,
      title: j.title,
      location: j.location?.name || "Unknown",
      apply_url: j.absolute_url,
      source: "greenhouse"
    }));
  } catch (err) {
    console.error(`❌ Greenhouse scrape failed for ${company.name}`, err);
    return [];
  }
}

/**
 * MAIN ROUTER
 */
export default async function routeScraper(company) {
  console.log(`🔎 Scraping ${company.name}`);

  try {
    switch (company.ats) {
      case "ashby":
        return await scrapeAshby(company);

      case "workday":
        return await scrapeWorkday(company);

      case "greenhouse":
        return await scrapeGreenhouse(company);

      case "generic":
      default:
        return await scrapeGeneric(company);
    }
  } catch (err) {
    console.error(`❌ Router crash for ${company.name}`, err);
    return [];
  }
}
