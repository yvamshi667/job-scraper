// extractors/router.js
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company) return [];

  const { ats, url, name } = company;

  if (!ats || !url) {
    console.warn(`⚠️ Missing ATS or URL for ${name}`);
    return [];
  }

  switch (ats.toLowerCase()) {
    case "greenhouse":
      return scrapeGreenhouse(company);

    case "lever":
      return scrapeLever(company);

    case "ashby":
      return scrapeAshby(company);

    default:
      console.warn(`⚠️ Unsupported ATS "${ats}" for ${name}`);
      return [];
  }
}
