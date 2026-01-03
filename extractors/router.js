// extractors/router.js

import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";
import { scrapeWorkday } from "./workday.js";

export async function routeScraper(company) {
  switch (company.ats) {
    case "greenhouse":
      return scrapeGreenhouse(company);

    case "ashby":
      return scrapeAshby(company);

    case "workday":
      return scrapeWorkday(company);

    case "generic":
    default:
      return scrapeGeneric(company);
  }
}
