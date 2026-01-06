import { greenhouse } from "./greenhouse.js";
import { ashby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

export async function routeScraper(company) {
  if (company.ats === "greenhouse") {
    return greenhouse(company);
  }

  if (company.ats === "ashby") {
    return ashby(company);
  }

  return scrapeGeneric(company);
}
