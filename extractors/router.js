import detectATS from "../detect.js";

import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export default async function routeScraper(company) {
  const ats = detectATS(company.careers_url);

  if (!ats) {
    console.log("Unknown ATS:", company.name);
    return [];
  }

  if (ats === "greenhouse") return scrapeGreenhouse(company);
  if (ats === "lever") return scrapeLever(company);
  if (ats === "ashby") return scrapeAshby(company);

  return [];
}
