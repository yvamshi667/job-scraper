import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";
import detectATS from "../detect.js";

export default async function scrapeCompany(company) {
  const ats = detectATS(company.careers_url);

  switch (ats) {
    case "greenhouse":
      return scrapeGreenhouse(company);
    case "lever":
      return scrapeLever(company);
    case "ashby":
      return scrapeAshby(company);
    default:
      console.warn(`⚠️ Unknown ATS for ${company.name}`);
      return [];
  }
}
