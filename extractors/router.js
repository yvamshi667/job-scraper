import { greenhouse } from "./greenhouse.js";
import { ashby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

export async function routeScraper(company) {
  if (!company || !company.ats) {
    console.warn("⚠️ Invalid company object", company);
    return [];
  }

  switch (company.ats) {
    case "greenhouse":
      return greenhouse(company);

    case "ashby":
      return ashby(company);

    default:
      return scrapeGeneric(company);
  }
}
