import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";
import detectATS from "../detect.js";

export async function scrapeCompany(company) {
  const ats = detectATS(company.careers_url);

  console.log(`🔍 ${company.name} → ${ats}`);

  if (ats === "greenhouse") return scrapeGreenhouse(company);
  if (ats === "lever") return scrapeLever(company);
  if (ats === "ashby") return scrapeAshby(company);

  return [];
}
