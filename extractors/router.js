import { detectPageType } from "../detect.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company || !company.careers_url) {
    console.log("❌ Missing careers_url");
    return [];
  }

  const url = company.careers_url;
  const ats = detectPageType(url);

  console.log(`🔍 ${company.name} → ${ats}`);

  try {
    if (ats === "GREENHOUSE") return await scrapeGreenhouse(company);
    if (ats === "LEVER") return await scrapeLever(company);
    if (ats === "ASHBY") return await scrapeAshby(company);

    console.log(`⚠️ Unsupported ATS for ${company.name}`);
    return [];
  } catch (err) {
    console.error(`🔥 Error scraping ${company.name}`, err);
    return [];
  }
}
