import fs from "fs";
import { scrapeGeneric } from "./scrapeGeneric.js";
import { scrapeGreenhouse } from "./scrapeGreenhouse.js";
import { scrapeAshby } from "./scrapeAshby.js";

const companies = JSON.parse(fs.readFileSync("companies.json", "utf8"));
const results = [];

for (const company of companies) {
  let jobs = [];

  if (company.ats === "greenhouse") {
    jobs = await scrapeGreenhouse(company);
  } else if (company.ats === "ashby") {
    jobs = await scrapeAshby(company);
  } else {
    jobs = await scrapeGeneric(company);
  }

  results.push(...jobs);
}

fs.mkdirSync("output", { recursive: true });
fs.writeFileSync("output/jobs.json", JSON.stringify(results, null, 2));

console.log(`📦 Saved ${results.length} jobs`);
