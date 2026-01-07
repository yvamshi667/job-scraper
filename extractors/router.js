// extractors/router.js
import { greenhouse } from "./greenhouse.js";
import { ashby } from "./ashby.js";
import { scrapeGithub } from "./scrapeGithub.js";

export async function routeCompany(company) {
  switch (company.ats) {
    case "greenhouse":
      return await greenhouse(company);

    case "ashby":
      return await ashby(company);

    case "github":
      return await scrapeGithub();

    default:
      console.warn("⚠️ Unknown ATS:", company.ats);
      return [];
  }
}
