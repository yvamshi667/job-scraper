import fs from "fs";
import path from "path";
import { detectCareersPage } from "../detect.js";

const companies = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

const OUTPUT = "companies.json";

async function discover() {
  console.log("🚀 Discovering companies...");

  const results = [];

  for (const company of companies) {
    const detected = await detectCareersPage(company.domain); // ✅ FIX

    if (detected) {
      console.log(`✅ Discovered ${company.name} → ${detected.careers_url}`);

      results.push({
        name: company.name,
        domain: company.domain,
        careers_url: detected.careers_url,
        ats: detected.ats
      });
    } else {
      console.log(`⚠️ No careers page found for ${company.name}`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  console.log(`📁 Saved ${results.length} companies to ${OUTPUT}`);
}

discover();
