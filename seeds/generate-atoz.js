/**
 * Generates a valid Greenhouse A–Z company seed file
 * GUARANTEED valid JSON (no trailing dots, no syntax bugs)
 */

import fs from "fs";
import path from "path";

const OUTPUT = path.join(process.cwd(), "seeds/greenhouse-atoz.json");

/**
 * Master US companies list (extend freely)
 * This is intentionally centralized and safe
 */
const COMPANIES = [
  // A
  ["Airbnb", "airbnb"],
  ["Airtable", "airtable"],
  ["Algolia", "algolia"],
  ["Asana", "asana"],
  ["Atlassian", "atlassian"],

  // B
  ["Baidu USA", "baidu"],
  ["BambooHR", "bamboohr"],
  ["Benchling", "benchling"],
  ["Betterment", "betterment"],
  ["BigCommerce", "bigcommerce"],
  ["Bill.com", "billdotcom"],
  ["Bitly", "bitly"],
  ["Blue Origin", "blueorigin"],
  ["Box", "boxinc"],
  ["Brex", "brex"],

  // C
  ["Canva", "canva"],
  ["Chime", "chime"],
  ["Circle", "circle"],
  ["Cloudflare", "cloudflare"],
  ["Coinbase", "coinbase"],

  // D
  ["Databricks", "databricks"],
  ["Datadog", "datadog"],
  ["DoorDash", "doordash"],
  ["Dropbox", "dropbox"],
  ["Duolingo", "duolingo"],

  // E
  ["Elastic", "elastic"],
  ["Epic Games", "epicgames"],

  // F
  ["Figma", "figma"],
  ["Flexport", "flexport"],

  // G
  ["GitHub", "github"],
  ["Gusto", "gusto"],

  // H
  ["HubSpot", "hubspot"],

  // I
  ["Indeed", "indeed"],
  ["Instacart", "instacart"],
  ["Intercom", "intercom"],

  // L
  ["Lyft", "lyft"],

  // M
  ["MongoDB", "mongodb"],

  // N
  ["Notion", "notion"],

  // O
  ["Okta", "okta"],
  ["OpenAI", "openai"],

  // P
  ["PagerDuty", "pagerduty"],
  ["Pinterest", "pinterest"],
  ["Plaid", "plaid"],

  // R
  ["Reddit", "reddit"],
  ["Rippling", "rippling"],
  ["Robinhood", "robinhood"],

  // S
  ["Slack", "slack"],
  ["Snowflake", "snowflakecomputing"],
  ["Spotify", "spotify"],
  ["Stripe", "stripe"],

  // T
  ["Twilio", "twilio"],
  ["Twitch", "twitch"],

  // U
  ["Uber", "uber"],

  // V
  ["Vercel", "vercel"],

  // Z
  ["Zendesk", "zendesk"],
  ["Zoom", "zoom"]
];

const data = COMPANIES.map(([name, slug]) => ({
  name,
  ats: "greenhouse",
  greenhouse_company: slug
}));

fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${data.length} companies → ${OUTPUT}`);
