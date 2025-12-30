import { scrapeGreenhouse } from "./greenhouse.js";

export async function scrapeCompany(company) {
  if (company.careers_url.includes("greenhouse.io")) {
    return scrapeGreenhouse(company);
  }
  return [];
}
