import fs from "fs";

const companies = [
  // A
  ["Airbnb", "airbnb"],
  ["Airtable", "airtable"],
  ["Algolia", "algolia"],
  ["Asana", "asana"],
  ["Atlassian", "atlassian"],

  // B
  ["BambooHR", "bamboohr"],
  ["Benchling", "benchling"],
  ["Betterment", "betterment"],
  ["BigCommerce", "bigcommerce"],
  ["Bitly", "bitly"],
  ["Box", "boxinc"],
  ["Bumble", "bumble"],

  // C
  ["Coinbase", "coinbase"],
  ["Cloudflare", "cloudflare"],
  ["Canva", "canva"],

  // D
  ["Databricks", "databricks"],
  ["Datadog", "datadog"],
  ["Dropbox", "dropbox"],

  // F
  ["Figma", "figma"],

  // G
  ["GitHub", "github"],

  // I
  ["Instacart", "instacart"],

  // L
  ["Lyft", "lyft"],

  // N
  ["Notion", "notion"],

  // P
  ["Pinterest", "pinterest"],
  ["Plaid", "plaid"],

  // R
  ["Robinhood", "robinhood"],

  // S
  ["Shopify", "shopify"],
  ["Slack", "slack"],
  ["Stripe", "stripe"],

  // T
  ["Twilio", "twilio"],

  // Z
  ["Zoom", "zoom"]
];

const output = companies.map(([name, slug]) => ({
  name,
  ats: "greenhouse",
  greenhouse_company: slug
}));

fs.mkdirSync("seeds", { recursive: true });
fs.writeFileSync(
  "seeds/greenhouse-atoz.json",
  JSON.stringify(output, null, 2)
);

console.log(`✅ Generated ${output.length} Greenhouse companies`);
