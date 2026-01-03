import scrapeGreenhouse from "./greenhouse.js";
import scrapeLever from "./lever.js";
import scrapeAshby from "./ashby.js";
import scrapeGeneric from "./scrapeGeneric.js";

export async function scrapeCompany(company) {
  const url = company.careers_url.toLowerCase();

  if (url.includes("greenhouse.io")) return scrapeGreenhouse(company);
  if (url.includes("lever.co")) return scrapeLever(company);
  if (url.includes("ashbyhq.com")) return scrapeAshby(company);

  return scrapeGeneric(company);
}
