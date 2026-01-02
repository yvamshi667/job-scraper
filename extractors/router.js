// extractors/router.js

import { scrapeGeneric } from "./scrapeGeneric.js";

export async function scrapeCompany(company) {
  // Default generic scraper
  return scrapeGeneric(company);
}
