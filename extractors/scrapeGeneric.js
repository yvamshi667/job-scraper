import * as cheerio from "cheerio";

export async function scrapeGeneric(careersUrl) {
  try {
    const res = await fetch(careersUrl);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const jobs = [];

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (
        !title ||
        !href ||
        title.length < 4 ||
        !/job|engineer|developer|manager|designer/i.test(title)
      ) {
        return;
      }

      const url = href.startsWith("http")
        ? href
        : new URL(href, careersUrl).href;

      jobs.push({
        title,
        url,
        location: null
      });
    });

    return jobs;
  } catch {
    return [];
  }
}
