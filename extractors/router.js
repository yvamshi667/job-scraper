import scrapeGeneric from "./scrapeGeneric.js";
import scrapeAshby from "./ashby.js";
import scrapeGreenhouse from "./greenhouse.js";
import scrapeWorkday from "./workday.js";

export default function getScraper(platform) {
  switch (platform) {
    case "ashby":
      return scrapeAshby;
    case "greenhouse":
      return scrapeGreenhouse;
    case "workday":
      return scrapeWorkday;
    default:
      return scrapeGeneric;
  }
}
