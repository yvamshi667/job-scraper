// extractors/discover.js
import { ingestCompanies } from "../supabase.js";

const SEED_COMPANIES = [
  { name: "Stripe", domain: "stripe.com" },
  { name: "Uber", domain: "uber.com" },
  { name: "Zoom", domain: "zoom.us" },
  { name: "Shopify", domain: "shopify.com" },
  { name: "Airbnb", domain: "airbnb.com" }
];

function guessATS(domain) {
  if (domain.includes("stripe")) return "greenhouse";
  if (domain.includes("shopify")) return "greenhouse";
  if (domain.includes("airbnb")) return "greenhouse";
  return "generic";
}

async function run() {
  console.log("🚀 Starting discovery...");

  const companies = SEED_COMPANIES.map((c) => ({
    name: c.name,
    careers_url: `https://${c.domain}/careers`,
    country: "US",
    ats_source: guessATS(c.domain),
    active: true
  }));

  console.log(`📦 Discovered ${companies.length} companies`);

  await ingestCompanies(companies);

  console.log("🎉 Discovery completed successfully");
}

run().catch((err) => {
  console.error("💥 Discovery crashed:", err);
  process.exit(1);
});
