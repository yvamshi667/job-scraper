// extractors/discover.js
import { ingestCompanies } from "../supabase.js";

const SEEDS = [
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Uber", ats: "greenhouse", slug: "uber" },
  { name: "Zoom", ats: "greenhouse", slug: "zoom" },
  { name: "Shopify", ats: "greenhouse", slug: "shopify" }
];

const companies = SEEDS.map(c => ({
  name: c.name,
  careers_url:
    c.ats === "greenhouse"
      ? `https://boards.greenhouse.io/${c.slug}`
      : "",
  ats_source: c.ats,
  country: "US",
  active: true
}));

console.log("🚀 Discovering companies...");
await ingestCompanies(companies);
console.log("🎉 Discovery done");
