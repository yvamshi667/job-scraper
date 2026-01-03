import cheerio from "cheerio";

export default async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url);
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();

    if (!href || !title) return;
    if (title.length < 5) return;

    if (
      href.includes("job") ||
      href.includes("career") ||
      href.includes("apply")
    ) {
      jobs.push({
        title,
        company: company.name,
        url: href.startsWith("http") ? href : new URL(href, company.careers_url).href,
        country: company.country || "US",
        ats_source: "generic"
      });
    }
  });

  return jobs;
}
