// extractors/scrapeGeneric.js
import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 JobScraperBot",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const jobs = [];

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (
        title.length > 5 &&
        /engineer|developer|software|data|backend|frontend/i.test(title)
      ) {
        jobs.push({
          company: company.name,
          title,
          url: href?.startsWith("http")
            ? href
            : company.careers_url + href,
          location: company.country || "Unknown",
          source: "careers_page",
        });
      }
    });

    return jobs.slice(0, 50); // safety cap
  } catch (err) {
    console.error(`❌ ${company.name} scrape failed`, err.message);
    return [];
  }
}
