import { scrapeGreenhouse } from "./greenhouse.js";

export async function scrapeCompany(company) {
  if (company.ats === "greenhouse") {
    return scrapeGreenhouse(company);
  }
  return [];
}
