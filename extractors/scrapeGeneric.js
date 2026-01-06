import * as cheerio from "cheerio";

export async function scrapeGeneric(company) {
  const jobs = [];

  try {
    const res = await fetch(company.careersUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      if (
        href.includes("job") ||
        href.includes("careers") ||
        href.includes("positions")
      ) {
        const url = href.startsWith("http")
          ? href
          : new URL(href, company.careersUrl).href;

        jobs.push({
          company: company.name,
          title: $(el).text().trim() || "Job Opening",
          location: "Unknown",
          url,
          ats: "generic"
        });
      }
    });
  } catch (err) {
    console.error(`❌ Generic scrape error (${company.name})`, err.message);
  }

  return jobs;
}
