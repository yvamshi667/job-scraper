// extractors/router.js
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";

export async function routeATS(company) {
  if (!company.ats && !company.careers_url) {
    console.warn(`⚠️ Missing ATS or URL for ${company.name}`);
    return [];
  }

  const ats = (company.ats || "").toLowerCase();
  const url = company.careers_url || "";

  if (ats === "greenhouse" || url.includes("greenhouse.io")) {
    return await scrapeGreenhouse(company);
  }

  if (ats === "lever" || url.includes("lever.co")) {
    return await scrapeLever(company);
  }

  if (ats === "ashby" || url.includes("ashbyhq.com")) {
    return await scrapeAshby(company);
  }

  console.warn(`⚠️ Unsupported ATS for ${company.name}`);
  return [];
}
