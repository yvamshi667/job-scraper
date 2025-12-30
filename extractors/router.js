import detect from "../detect.js";
import { scrapeGreenhouse } from "./extractors/greenhouse.js";

export async function scrapeCompany(company) {
  const type = detectPageType(company.career_url);

  if (type === "GREENHOUSE") {
    return scrapeGreenhouse(company);
  }

  return []; // skip unsupported for now
}
