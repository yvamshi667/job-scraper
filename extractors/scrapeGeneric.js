import * as cheerio from "cheerio";

export default async function scrapeGeneric(company) {
  try {
    console.log(`🔍 Scraping ${company.name} (generic)`);

    const res = await fetch(company.careers_url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const links = $("a[href]")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean);

    console.log(`📄 ${company.name}: found ${links.length} links`);
  } catch (err) {
    console.error(`❌ Generic scrape failed for ${company.name}`, err.message);
  }
}
