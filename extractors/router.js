import { scrapeGreenhouse } from "./scrapeGreenhouse.js";
import { scrapeGeneric } from "./scrapeGeneric.js";
import { scrapeAshby } from "./scrapeAshby.js";

/**
 * Routes a company object to the correct scraper
 */
export async function routeCompany(company) {
  if (!company || !company.ats) {
    console.warn("⚠️ Invalid company:", company);
    return [];
  }

  switch (company.ats) {
    case "greenhouse":
      return await scrapeGreenhouse(company);

    case "ashby":
      return await scrapeAshby(company);

    case "generic":
      return await scrapeGeneric(company);

    default:
      console.warn(`⚠️ Unknown ATS: ${company.ats}`);
      return [];
  }
}
