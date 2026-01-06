import { greenhouse } from "./greenhouse.js";
import { scrapeAshby } from "./scrapeAshby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

export async function routeScraper(company) {
  switch (company.ats) {
    case "greenhouse":
      return greenhouse(company);

    case "ashby":
      return scrapeAshby(company);

    default:
      return scrapeGeneric(company);
  }
}
