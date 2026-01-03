import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";

export async function routeATS(company) {
  if (!company?.careers_url) return [];

  const url = company.careers_url.toLowerCase();

  if (url.includes("greenhouse")) return scrapeGreenhouse(company);
  if (url.includes("lever")) return scrapeLever(company);
  if (url.includes("ashby")) return scrapeAshby(company);

  return [];
}
