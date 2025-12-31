import detectATS from "../detect.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export default async function routeScraper(company) {
  const ats = detectATS(company.careers_url);

  if (!ats) {
    console.warn(`⚠️ Unknown ATS for ${company.name}`);
    return [];
  }

  if (ats === "greenhouse") return await scrapeGreenhouse(company);
  if (ats === "lever") return await scrapeLever(company);
  if (ats === "ashby") return await scrapeAshby(company);

  return [];
}
