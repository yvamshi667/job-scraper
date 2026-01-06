import * as cheerio from "cheerio";

export async function scrapeGenericCareers(url) {
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const link = $(el).attr("href");

    if (title && title.length > 5) {
      jobs.push({
        title,
        url: link?.startsWith("http") ? link : `${url}${link || ""}`
      });
    }
  });

  return jobs;
}
