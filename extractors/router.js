import { greenhouse } from "./greenhouse.js";

/**
 * Route a company to the correct ATS scraper
 */
export async function routeCompany(company) {
  if (!company || !company.ats) {
    console.warn("⚠️ Invalid company object:", company);
    return [];
  }

  switch (company.ats) {
    case "greenhouse":
      return await greenhouse(company);

    default:
      console.warn(`⚠️ Unsupported ATS: ${company.ats}`);
      return [];
  }
}
