import * as cheerio from "cheerio";

export default async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url);
    const html = await res.text();

    const $ = cheerio.load(html);
    const links = $("a")
      .map((_, el) => $(el).attr("href"))
      .get()
      .filter(Boolean);

    console.log(`📄 ${company.name}: found ${links.length} links`);
  } catch (err) {
    console.error(`❌ ${company.name} failed`, err.message);
  }
}
