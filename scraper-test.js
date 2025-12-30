import fetch from "node-fetch";

const WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  `${process.env.SUPABASE_URL}/functions/v1/ingest-jobs`;

const jobs = [
  {
    title: "GitHub Action Test Job",
    company: "GitHubTestCo",
    country: "US",
    url: "https://example.com/github-test-job"
  }
];

async function run() {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": process.env.SCRAPER_SECRET_KEY
    },
    body: JSON.stringify({ jobs })
  });

  const data = await res.json();
  console.log("Webhook response:", data);
}

run().catch(console.error);
