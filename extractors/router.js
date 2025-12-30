import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { detectPageType } from "../detect.js";

export async function scrapeCompany(company) {
  const type = detectPageType(company.careers_url);

  switch (type) {
    case "GREENHOUSE":
      return scrapeGreenhouse(company);
    case "LEVER":
      return scrapeLever(company);
    case "ASHBY":
      return scrapeAshby(company);
    default:
      return [];
  }
}
