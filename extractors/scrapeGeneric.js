import * as cheerio from "cheerio";

export async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const jobs = [];

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (title && href && title.length > 5) {
        jobs.push({
          company: company.name,
          title,
          url: href.startsWith("http") ? href : company.domain + href
        });
      }
    });

    return jobs.slice(0, 50); // cap
  } catch (err) {
    console.warn(`⚠️ Failed scraping ${company.name}`);
    return [];
  }
}
