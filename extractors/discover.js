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

  const results = [];

  for (const company of COMPANIES) {
    const careers = await detectCareersPage(company.domain);

    if (!careers) {
      console.warn(`⚠️ No careers page for ${company.name}`);
      continue;
    }

    console.log(`✅ Discovered ${company.name} → ${careers}`);

    results.push({
      name: company.name,
      domain: company.domain,
      careers_url: careers,
      ats: careers.includes("ashby") ? "ashby" : "generic"
    });
  }

  fs.writeFileSync("companies.json", JSON.stringify(results, null, 2));
  console.log(`📁 Saved ${results.length} companies to companies.json`);
}

discover();
