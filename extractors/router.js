import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export async function routeATS(company) {
  const ats = (company.ats || "").toLowerCase();
  const url = company.careers_url || "";

  if (ats === "greenhouse" || url.includes("greenhouse.io")) {
    return scrapeGreenhouse(company);
  }

  if (ats === "lever" || url.includes("lever.co")) {
    return scrapeLever(company);
  }

  if (ats === "ashby" || url.includes("ashbyhq.com")) {
    return scrapeAshby(company);
  }

  console.warn(`⚠️ Unsupported ATS for ${company.name}`);
  return [];
}
