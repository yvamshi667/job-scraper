import fetch from "node-fetch";
import { scrapeCompany } from "./router.js";

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
  throw new Error("Missing webhook env vars");
}

/**
 * TEMP companies list
 * Later this comes from DB / Lovable UI
 */
const companies = [
  {
    name: "Stripe",
    careers_url: "https://boards.greenhouse.io/stripe",
    country: "US"
  },
  {
    name: "Airbnb",
    careers_url: "https://boards.greenhouse.io/airbnb",
    country: "US"
  }
];

const allJobs = [];

for (const company of companies) {
  const jobs = await scrapeCompany(company);
  allJobs.push(...jobs);
}

if (allJobs.length === 0) {
  console.log("No jobs found");
  process.exit(0);
}

const res = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-scraper-key": SCRAPER_SECRET_KEY
  },
  body: JSON.stringify({ jobs: allJobs })
});

const result = await res.json();
console.log("Webhook response:", result);
