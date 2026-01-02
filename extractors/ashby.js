// extractors/ashby.js
import fetch from "node-fetch";

export async function scrapeAshby(company) {
  const { name, url } = company;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const html = await res.text();
    const jobs = [];

    // Ashby embeds jobs in JSON
    const match = html.match(/window\.__ASHBY_JOBS__\s*=\s*(\{.*?\});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);

    for (const job of data.jobs || []) {
      jobs.push({
        title: job.title,
        location: job.location || "Unknown",
        company: name,
        url: job.url,
        ats_source: "ashby",
        is_direct: true,
        is_active: true,
      });
    }

    return jobs;
  } catch (err) {
    console.error(`❌ Ashby failed for ${name}:`, err.message);
    return [];
  }
}
