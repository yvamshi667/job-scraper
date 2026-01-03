// extractors/router.js

import scrapeAshby from "./ashby.js";
import scrapeWorkday from "./workday.js";
import scrapeGeneric from "./scrapeGeneric.js";

/**
 * Returns the correct scraper function based on ATS type
 * Always falls back safely to generic scraper
 */
export default function routeScraper(company) {
  const ats = company?.ats?.toLowerCase();

  switch (ats) {
    case "ashby":
      return scrapeAshby;

    case "workday":
      return scrapeWorkday;

    default:
      return scrapeGeneric;
  }
}
