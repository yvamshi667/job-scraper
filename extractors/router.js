import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./ashby.js";

export default async function router(company) {
  switch (company.ats) {
    case "ashby":
      return scrapeAshby(company);
    case "generic":
    default:
      return scrapeGeneric(company);
  }
}
