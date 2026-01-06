import * as cheerio from "cheerio";

export async function scrapeGeneric(company) {
  const jobs = [];

  const careersUrl = `${company.domain.replace(/\/$/, "")}/careers`;

  try {
    const res = await fetch(careersUrl);
    const html = await res.text();
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      if (href.includes("job") || href.includes("career")) {
        const url = href.startsWith("http")
          ? href
          : new URL(href, careersUrl).href;

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
