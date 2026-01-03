// extractors/scrapeGeneric.js

import fetch from "global-fetch";
import * as cheerio from "cheerio";

export async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url);
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
        url: href.startsWith("http")
          ? href
          : new URL(href, company.careers_url).href
      });
    }
  });

  return jobs;
}
