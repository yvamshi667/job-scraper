import * as cheerio from "cheerio";

/**
 * Generic scraper for careers pages
 * Extracts only REAL job links
 */
export default async function scrapeGeneric(company) {
  const { careers_url, name } = company;

  if (!careers_url) {
    console.warn(`⚠️ No careers URL for ${name}`);
    return [];
  }

  try {
    const res = await fetch(careers_url, { redirect: "follow" });

    if (!res.ok) {
      console.warn(`⚠️ ${name} returned ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const jobs = [];
    const seen = new Set();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title) return;

      // STRICT job URL filtering
      if (
        !href.match(/\/(jobs?|careers?|positions?|openings?|apply)\//i)
      ) {
        return;
      }

      const url = href.startsWith("http")
        ? href
        : new URL(href, careers_url).href;

      if (seen.has(url)) return;
      seen.add(url);

      jobs.push({
        company: name,
        title,
        url,
        source: "generic",
        scraped_at: new Date().toISOString()
      });
    });

    console.log(`➡️ ${name}: found ${jobs.length} jobs`);
    return jobs;
  } catch (err) {
    console.error(`❌ ${name} scrape failed`, err.message);
    return [];
  }
}
