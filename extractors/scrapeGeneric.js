import { load } from "cheerio";

export default async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = load(html);

    const jobs = [];

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (!title || title.length < 6) return;
      if (!href) return;

      if (/job|career|opening|position/i.test(href)) {
        jobs.push({
          company: company.name,
          title,
          url: href.startsWith("http")
            ? href
            : company.domain + href
        });
      }
    });

    return jobs;
  } catch (err) {
    console.error(`❌ ${company.name} scrape failed`, err.message);
    return [];
  }
}
