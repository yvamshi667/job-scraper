import detectPageType from "./detect.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";

export async function scrapeCompany(company) {
  if (!company || !company.careers_url) {
    console.log("❌ Missing careers_url for company");
    return [];
  }

  const ats = detectPageType(company.careers_url);
  console.log(`Detected ATS for ${company.name}: ${ats}`);

  try {
    if (ats === "GREENHOUSE") {
      return await scrapeGreenhouse(company);
    }

    if (ats === "LEVER") {
      return await scrapeLever(company);
    }

    console.log(`⚠️ Unsupported ATS: ${ats}`);
    return [];
  } catch (err) {
    console.error(`❌ Scrape failed for ${company.name}`, err.message);
    return [];
  }
}
