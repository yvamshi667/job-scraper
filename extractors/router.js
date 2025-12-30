import { detectPageType } from "../detect.js";
import { scrapeGreenhouse } from "./greenhouse.js";

export async function scrapeCompany(company) {
  const type = detectPageType(company.careers_url);

  if (type === "GREENHOUSE") {
    return scrapeGreenhouse(company);
  }

  // later: LEVER, CUSTOM_PUBLIC
  return [];
}
