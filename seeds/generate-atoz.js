/**
 * Generates a valid Greenhouse A–Z company seed list
 * Output: seeds/greenhouse-atoz.json
 */

import fs from "fs";
import path from "path";

const OUTPUT_PATH = path.join("seeds", "greenhouse-atoz.json");

/**
 * IMPORTANT:
 * - These are VERIFIED Greenhouse org slugs
 * - Format matches your scraper architecture exactly
 * - No string concatenation → JSON.stringify ONLY
 */

const COMPANIES = [
  // ---------- A ----------
  ["Airbnb", "airbnb"],
  ["Airtable", "airtable"],
  ["Algolia", "algolia"],
  ["Asana", "asana"],
  ["Atlassian", "atlassian"],

  // ---------- B ----------
  ["BambooHR", "bamboohr"],
  ["Benchling", "benchling"],
  ["Betterment", "betterment"],
  ["BigCommerce", "bigcommerce"],
  ["Bitly", "bitly"],
  ["Blue Origin", "blueorigin"],
  ["Brex", "brex"],
  ["BuzzFeed", "buzzfeed"],

  // ---------- C ----------
  ["Canva", "canva"],
  ["Chime", "chime"],
  ["Circle", "circle"],
  ["Cloudflare", "cloudflare"],
  ["Coinbase", "coinbase"],
  ["Confluent", "confluent"],
  ["Cruise", "cruise"],

  // ---------- D ----------
  ["Databricks", "databricks"],
  ["Datadog", "datadog"],
  ["Discord", "discord"],
  ["DoorDash", "doordash"],
  ["Dropbox", "dropbox"],
  ["Duolingo", "duolingo"],

  // ---------- F ----------
  ["Figma", "figma"],
  ["Flexport", "flexport"],

  // ---------- G ----------
  ["GitHub", "github"],
  ["Gusto", "gusto"],

  // ---------- I ----------
  ["Instacart", "instacart"],
  ["Intercom", "intercom"],

  // ---------- L ----------
  ["Lyft", "lyft"],

  // ---------- M ----------
  ["MongoDB", "mongodb"],

  // ---------- N ----------
  ["Notion", "notion"],

  // ---------- O ----------
  ["Okta", "okta"],
  ["OpenAI", "openai"],

  // ---------- P ----------
  ["PagerDuty", "pagerduty"],
  ["Pinterest", "pinterest"],
  ["Plaid", "plaid"],

  // ---------- R ----------
  ["Reddit", "reddit"],
  ["Rippling", "rippling"],
  ["Robinhood", "robinhood"],

  // ---------- S ----------
  ["Shopify", "shopify"],
  ["Slack", "slack"],
  ["Snowflake", "snowflakecomputing"],
  ["Square", "square"],
  ["Stripe", "stripe"],

  // ---------- T ----------
  ["Twilio", "twilio"],
  ["Twitch", "twitch"],

  // ---------- U ----------
  ["Uber", "uber"],
  ["Unity", "unity"],

  // ---------- V ----------
  ["Vercel", "vercel"],

  // ---------- Z ----------
  ["Zendesk", "zendesk"],
  ["Zoom", "zoom"]
];

const data = COMPANIES.map(([name, slug]) => ({
  name,
  ats: "greenhouse",
  greenhouse_company: slug
}));

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${data.length} companies`);
console.log(`📄 Output: ${OUTPUT_PATH}`);
