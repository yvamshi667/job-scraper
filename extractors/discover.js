import { ingestCompanies } from "../supabase.js";

const SEEDS = [
  { name: "Stripe", domain: "stripe.com", ats: "generic" },
  { name: "Uber", domain: "uber.com", ats: "generic" },
  { name: "Zoom", domain: "zoom.us", ats: "generic" },
  { name: "Shopify", domain: "shopify.com", ats: "ashby" },
];

async function run() {
  console.log("🚀 Discovering companies...");

  await ingestCompanies(SEEDS);

  console.log(`✅ Ingested ${SEEDS.length} companies`);
  console.log("🎉 Discovery done");
}

run().catch((err) => {
  console.error("💥 Discovery failed:", err);
  process.exit(1);
});
