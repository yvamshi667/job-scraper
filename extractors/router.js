// extractors/router.js
import { scrapeGithub } from "./scrapeGithub.js";
import { scrapeGreenhouse } from "./scrapeGreenhouse.js";
import { scrapeAshby } from "./scrapeAshby.js";

export async function routeSource(source, payload) {
  switch (source) {
    case "github":
      return await scrapeGithub();

    case "greenhouse":
      return await scrapeGreenhouse(payload);

    case "ashby":
      return await scrapeAshby(payload);

    default:
      console.warn("⚠️ Unknown source:", source);
      return [];
  }
}
