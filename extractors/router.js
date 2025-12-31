import { detectPageType } from "../detect.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";

export async function scrapeCompany(company) {
  if (!company || !company.careers_url) {
    console.log("❌ Missing careers_url for company");
    return [];
  }

  const url = company.careers_url;
  const type = detectPageType(url);

  console.log(`🔍 ${company.name} detected ATS: ${type}`);

  switch (type) {
    case "GREENHOUSE":
      return await scrapeGreenhouse(company);

    case "LEVER":
      return await scrapeLever(company);

    case "ASHBY":
      return await scrapeAshby(company);

    default:
      console.log(`⚠️ Unsupported ATS for ${company.name}`);
      return [];
  }
}
