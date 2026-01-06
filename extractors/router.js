import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./ashby.js";

/**
 * Routes a company to the correct scraper
 * Safe defaults
 * No crashes
 * Node 20 compatible
 */
export default async function routeScraper(company) {
  if (!company || !company.careers_url) {
    return [];
  }

  switch (company.ats) {
    case "ashby":
      return await scrapeAshby(company);

    case "generic":
    default:
      return await scrapeGeneric(company);
  }
}
