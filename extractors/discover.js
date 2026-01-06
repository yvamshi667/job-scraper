import fs from "fs";
import path from "path";
import { detectCareersPage, normalizeDomain } from "../detect.js";

const SEED_PATH = path.join("seeds", "companies.seed.json");
const OUT_PATH = "companies.json";

async function discover() {
  const seeds = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));

  const results = [];

  console.log("🚀 Discovering companies...");

  for (const c of seeds) {
    const name = c.name || "Unknown";
    const domain = normalizeDomain(c.domain);

    if (!domain) {
      console.log(`⚠️ Skipping ${name} (invalid domain)`);
      continue;
    }

    const detected = await detectCareersPage(domain);

    if (!detected) {
      console.log(`⚠️ No careers page found for ${name}`);
      continue;
    }

    console.log(`✅ Discovered ${name} -> ${detected.careers_url} (${detected.ats})`);

    results.push({
      name,
      domain,
      careers_url: detected.careers_url,
      ats: detected.ats
    });
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`🧾 Saved ${results.length} companies to ${OUT_PATH}`);
}

discover();
