import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company.ats_source) return [];

  switch (company.ats_source) {
    case "greenhouse":
      return scrapeGreenhouse(company);
    case "lever":
      return scrapeLever(company);
    case "ashby":
      return scrapeAshby(company);
    default:
      return [];
  }
}
