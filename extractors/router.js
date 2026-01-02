// extractors/router.js
import { scrapeGeneric } from "./scrapeGeneric.js";

export async function scrapeCompany(company) {
  if (!company?.careers_url) {
    console.warn(`⚠️ ${company.name}: missing careers_url`);
    return [];
  }

  return scrapeGeneric(company);
}
