import { detectPageType } from "../detect.js";
import { scrapeGreenhouse } from "./greenhouse.js";
// future:
// import { scrapeLever } from "./lever.js";
// import { scrapeAshby } from "./ashby.js";

export async function scrapeCompany(company) {
  const type = detectPageType(company.careers_url);

  switch (type) {
    case "GREENHOUSE":
      return await scrapeGreenhouse(company);

    // case "LEVER":
    //   return await scrapeLever(company);

    // case "ASHBY":
    //   return await scrapeAshby(company);

    default:
      console.log(`Skipping unsupported type: ${company.careers_url}`);
      return [];
  }
}
