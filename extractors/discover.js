import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectCareersPage } from "../detect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT = path.join(__dirname, "../companies.json");

const SEED_COMPANIES = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

console.log("🚀 Discovering companies...");

const discovered = [];

for (const company of SEED_COMPANIES) {
  const result = await detectCareersPage(company.domain);

  if (!result) {
    console.warn(`⚠️ No careers page found for ${company.name}`);
    continue;
  }

  console.log(`✅ Discovered ${company.name} → ${result.careersUrl}`);

  discovered.push({
    name: company.name,
    domain: company.domain,
    careers_url: result.careersUrl,
    ats: result.ats
  });
}

fs.writeFileSync(OUTPUT, JSON.stringify(discovered, null, 2));

console.table(discovered);
console.log(`🎉 Discovered ${discovered.length} companies`);
