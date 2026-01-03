// extractors/router.js
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeGeneric } from "./scrapeGeneric.js";

export async function scrapeCompany(company) {
  const url = company?.careers_url;
  const ats = (company?.ats_source || "").toLowerCase();

  if (!url) return [];

  // If you store ats_source in DB, use it directly:
  if (ats === "greenhouse") return scrapeGreenhouse(company);
  if (ats === "lever") return scrapeLever(company);
  if (ats === "ashby") return scrapeAshby(company);

  // fallback
  return scrapeGeneric(company);
}
