import scrapeGreenhouse from "./greenhouse.js";
import scrapeAshby from "./ashby.js";
import scrapeLever from "./lever.js";
import scrapeGeneric from "./scrapeGeneric.js";

export default async function scrapeCompany(company) {
  const url = company.careers_url.toLowerCase();

  if (url.includes("greenhouse")) return scrapeGreenhouse(company);
  if (url.includes("ashbyhq")) return scrapeAshby(company);
  if (url.includes("lever")) return scrapeLever(company);

  return scrapeGeneric(company);
}
