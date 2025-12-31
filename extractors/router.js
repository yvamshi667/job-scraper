import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export async function routeATS(company) {
  if (!company?.ats || !company?.careers_url) {
    console.warn(`⚠️ Missing ATS or URL for ${company?.name}`);
    return [];
  }

  const ats = company.ats.trim().toLowerCase();

  switch (ats) {
    case "greenhouse":
      return await scrapeGreenhouse(company);

    case "lever":
      return await scrapeLever(company);

    case "ashby":
      return await scrapeAshby(company);

    default:
      console.warn(`⚠️ Unsupported ATS "${company.ats}" for ${company.name}`);
      return [];
  }
}
