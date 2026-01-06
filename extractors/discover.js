import { detectCareersPage } from "../detect.js";

/**
 * SEED COMPANIES
 * You can expand this list later (CSV, DB, etc.)
 */
const SEEDS = [
  { name: "Stripe", domain: "https://stripe.com" },
  { name: "Uber", domain: "https://www.uber.com" },
  { name: "Zoom", domain: "https://zoom.us" },
  { name: "Airbnb", domain: "https://www.airbnb.com" }
];

console.log("🚀 Discovering companies...");

const discovered = [];

for (const seed of SEEDS) {
  try {
    const careersUrl = await detectCareersPage(seed.domain);

    if (!careersUrl) {
      console.warn(`⚠️ No careers page found for ${seed.name}`);
      continue;
    }

    discovered.push({
      name: seed.name,
      domain: seed.domain,
      careers_url: careersUrl,
      ats: detectATS(careersUrl)
    });

    console.log(`✅ Discovered ${seed.name} → ${careersUrl}`);
  } catch (err) {
    console.error(`❌ Failed ${seed.name}`, err.message);
  }
}

if (discovered.length === 0) {
  console.warn("⚠️ No companies discovered");
} else {
  console.log(`🎉 Discovered ${discovered.length} companies`);
  console.table(discovered);
}

/**
 * SIMPLE ATS DETECTION
 */
function detectATS(url) {
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("ashbyhq.com")) return "ashby";
  if (url.includes("lever.co")) return "lever";
  return "generic";
}

export default discovered;
