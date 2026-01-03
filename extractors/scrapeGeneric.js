import { load } from "cheerio";

export default async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const html = await res.text();
    const $ = load(html);

    const jobs = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().trim();

      if (!href || !title) return;
      if (title.length < 5) return;

      // ❌ Filter out junk links
      if (
        /privacy|terms|cookie|sign in|log in|language|русский|français|contact|about/i.test(
          title
        )
      ) {
        return;
      }

      // ✅ Only real job links
      if (
        href.includes("job") ||
        href.includes("career") ||
        href.includes("apply")
      ) {
        jobs.push({
          title,
          company: company.name,
          url: href.startsWith("http")
            ? href
            : new URL(href, company.careers_url).href,
          country: company.country || "US",
          ats_source: "generic",
        });
      }
    });

    return jobs;
  } catch (err) {
    console.error(`Generic scrape failed for ${company.name}:`, err.message);
    return [];
  }
}
