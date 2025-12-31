import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

/**
 * Routes scraping based on ATS type
 */
export async function routeATS(company) {
  const ats = (company.ats || "").toLowerCase();

  switch (ats) {
    case "greenhouse":
      return await scrapeGreenhouse(company);

    case "lever":
      return await scrapeLever(company);

    case "ashby":
      return await scrapeAshby(company);

    default:
      console.warn(`⚠️ Unknown ATS "${company.ats}" for ${company.name}`);
      return [];
  }
}
