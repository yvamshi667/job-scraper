// extractors/router.js
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company.ats || !company.careers_url) return [];

  switch (company.ats.toLowerCase()) {
    case "greenhouse":
      return scrapeGreenhouse(company);
    case "lever":
      return scrapeLever(company);
    case "ashby":
      return scrapeAshby(company);
    default:
      console.warn(`⚠️ Unsupported ATS: ${company.ats}`);
      return [];
  }
}
