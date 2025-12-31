import { detectPageType } from "../detect.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company || !company.careers_url) {
    console.log("❌ Company missing careers_url");
    return [];
  }

  const url = company.careers_url;
  const ats = detectPageType(url);

  console.log(`🔍 ${company.name} → ATS = ${ats}`);

  try {
    if (ats === "GREENHOUSE") return await scrapeGreenhouse(company);
    if (ats === "LEVER") return await scrapeLever(company);
    if (ats === "ASHBY") return await scrapeAshby(company);

    console.log(`⚠️ Unsupported ATS: ${url}`);
    return [];
  } catch (err) {
    console.error(`🔥 Scrape failed for ${company.name}`, err);
    return [];
  }
}
