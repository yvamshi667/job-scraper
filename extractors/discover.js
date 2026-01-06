import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { detectCareersPage } from "../detect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, "..", "companies.json");

const SEED_COMPANIES = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

(async function discover() {
  console.log("🚀 Discovering companies...");

  const discovered = [];

  for (const company of SEED_COMPANIES) {
    const result = await detectCareersPage(company);

    if (result) {
      discovered.push(result);
      console.log(`✅ Discovered ${result.name} → ${result.careers_url}`);
    } else {
      console.log(`⚠️ No careers page found for ${company.name}`);
    }
  }

  if (!discovered.length) {
    console.log("⚠️ No companies discovered");
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(discovered, null, 2));
  console.log(`📁 Saved ${discovered.length} companies to companies.json`);
})();
