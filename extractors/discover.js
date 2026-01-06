// extractors/discover.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { detectCareersPage } from "../detect.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.join(process.cwd(), "companies.json");

// ✅ Start with a small seed list; you can keep expanding this daily
const SEED_COMPANIES = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Airbnb", domain: "https://airbnb.com" },
  { name: "Notion", domain: "https://www.notion.so" },
  { name: "Rippling", domain: "https://www.rippling.com" }
];

async function discover() {
  console.log("🚀 Discovering companies...");

  const results = [];

  for (const c of SEED_COMPANIES) {
    const found = await detectCareersPage(c.domain);

    if (!found) {
      console.log(`⚠️ No careers page found for ${c.name}`);
      continue;
    }

    // ATS override: if careers url is Ashby job board
    let ats = found.ats;
    if ((found.careers_url || "").includes("jobs.ashbyhq.com")) ats = "ashby";

    results.push({
      name: c.name,
      domain: c.domain,
      careers_url: found.careers_url,
      ats
    });

    console.log(`✅ Discovered ${c.name} → ${found.careers_url} (${ats})`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`💾 Saved ${results.length} companies to companies.json`);
}

discover();
