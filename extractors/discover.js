import fs from "fs";
import { detectCareersPage } from "../detect.js";

const COMPANIES = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

console.log("🚀 Discovering companies...");

const discovered = [];

for (const c of COMPANIES) {
  const careers = await detectCareersPage(c.domain);
  if (careers) {
    console.log(`✅ Discovered ${c.name} → ${careers}`);
    discovered.push({
      name: c.name,
      domain: c.domain,
      careers_url: careers,
      ats: "generic"
    });
  } else {
    console.log(`⚠️ No careers page found for ${c.name}`);
  }
}

fs.writeFileSync(
  "companies.json",
  JSON.stringify(discovered, null, 2)
);

console.table(discovered);
console.log(`🎉 Discovered ${discovered.length} companies`);
