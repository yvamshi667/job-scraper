// ===============================
// 🇺🇸 DISCOVERY SEEDS — USA FIRST
// ===============================

// Tier 1: US Tech Giants (Anchor nodes)
const SEEDS_TIER_1 = [
  "google.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "meta.com",
  "netflix.com",
  "tesla.com",
  "nvidia.com",
  "oracle.com",
  "ibm.com"
];

// Tier 2: US Tech Scaleups (Highest ROI)
const SEEDS_TIER_2 = [
  "stripe.com",
  "airbnb.com",
  "uber.com",
  "lyft.com",
  "coinbase.com",
  "databricks.com",
  "snowflake.com",
  "figma.com",
  "notion.so",
  "shopify.com",
  "twilio.com",
  "squareup.com",
  "robinhood.com",
  "doordash.com",
  "instacart.com",
  "palantir.com",
  "salesforce.com",
  "servicenow.com"
];

// Tier 3: Remote-first (US-heavy hiring)
const SEEDS_REMOTE = [
  "automattic.com",
  "zapier.com",
  "gitlab.com",
  "hashicorp.com",
  "elastic.co",
  "cloudflare.com",
  "vercel.com",
  "netlify.com"
];

// ===============================
// ✅ ACTIVE SEEDS (START HERE)
// ===============================
export const DISCOVERY_SEEDS = [
  ...SEEDS_TIER_1,
  ...SEEDS_TIER_2,
  ...SEEDS_REMOTE
];

// ===============================
// 🔧 DISCOVERY LIMITS
// ===============================
export const DISCOVERY_CONFIG = {
  country: "US",
  maxCompaniesPerRun: 1000,   // increase to 5000 later
  allowGenericCareers: true,
  dedupeBy: "careers_url",
  logLevel: "info"
};
