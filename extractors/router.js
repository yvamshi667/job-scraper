import scrapeGeneric from "./scrapeGeneric.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeAshby from "./ashby.js";
import scrapeLever from "./lever.js";

export async function routeScraper(company) {
  switch (company.ats) {
    case "greenhouse":
      return scrapeGreenhouse(company);
    case "ashby":
      return scrapeAshby(company);
    case "lever":
      return scrapeLever(company);
    default:
      return scrapeGeneric(company);
  }
}
