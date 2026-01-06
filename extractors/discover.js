import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectCareersPage } from "../detect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const companiesSeed = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Uber", domain: "https://uber.com" },
  { name: "Airbnb", domain: "https://airbnb.com" }
];

async function run() {
  console.log("🚀 Discovering companies...");

  const discovered = [];

  for (const company of companiesSeed) {
    const careersUrl = await detectCareersPage(company.domain);

    if (!careersUrl) {
      console.warn(`⚠️ No careers page found for ${company.name}`);
      continue;
    }

    console.log(`✅ Discovered ${company.name} → ${careersUrl}`);

    discovered.push({
      name: company.name,
      domain: company.domain,
      careers_url: careersUrl,
      ats: "generic"
    });
  }

  if (discovered.length === 0) {
    console.warn("⚠️ No companies discovered");
    return;
  }

  const outPath = path.join(__dirname, "companies.json");
  fs.writeFileSync(outPath, JSON.stringify(discovered, null, 2));

  console.log(`🎉 Discovered ${discovered.length} companies`);
}

run();
