/**
 * Auto-generate A–Z Greenhouse seed list
 * Output: seeds/greenhouse-atoz.json
 */

import fs from "fs";
import path from "path";

const OUTPUT_FILE = path.resolve("seeds/greenhouse-atoz.json");

/**
 * MASTER LIST
 * (You can safely extend this later to 5k / 10k companies)
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
  ["Block", "block"],
  ["Blue Origin", "blueorigin"],
  ["Box", "boxinc"],
  ["Bumble", "bumble"],

  // C
  ["Canva", "canva"],
  ["Circle", "circle"],
  ["Cloudflare", "cloudflare"],
  ["Coinbase", "coinbase"],
  ["Confluent", "confluent"],
  ["Coursera", "coursera"],
  ["Cruise", "cruise"],

  // D
  ["Databricks", "databricks"],
  ["Datadog", "datadog"],
  ["Discord", "discord"],
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
  ["Nike", "nike"],

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
  ["Roblox", "roblox"],

  // S
  ["Shopify", "shopify"],
  ["Slack", "slack"],
  ["Snowflake", "snowflakecomputing"],
  ["Spotify", "spotify"],
  ["Square", "square"],

  // T
  ["Toast", "toast"],
  ["Twilio", "twilio"],
  ["Twitch", "twitch"],

  // U
  ["Unity", "unity"],
  ["UiPath", "uipath"],
  ["Udemy", "udemy"],

  // V
  ["Vercel", "vercel"],

  // W
  ["Waymo", "waymo"],
  ["Webflow", "webflow"],

  // Z
  ["Zendesk", "zendesk"],
  ["Zoom", "zoom"]
];

// Build JSON
const data = COMPANIES.map(([name, slug]) => ({
  name,
  ats: "greenhouse",
  greenhouse_company: slug
}));

// Write file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${data.length} companies`);
console.log(`📄 File: ${OUTPUT_FILE}`);
