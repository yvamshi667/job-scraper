import fs from "fs";
import { detectCareersPage } from "../detect.js";

const COMPANIES = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

async function discover() {
  console.log("🚀 Discovering companies...");

  const discovered = [];

  for (const company of COMPANIES) {
    const careersUrl = await detectCareersPage(company.domain);

    if (careersUrl) {
      console.log(`✅ Discovered ${company.name} → ${careersUrl}`);
      discovered.push({
        name: company.name,
        domain: company.domain,
        careers_url: careersUrl,
        ats: "generic"
      });
    } else {
      console.log(`⚠️ No careers page found for ${company.name}`);
    }
  }

  fs.writeFileSync("companies.json", JSON.stringify(discovered, null, 2));
  console.log(`📄 Saved ${discovered.length} companies to companies.json`);
}

discover();
