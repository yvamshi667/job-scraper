import cheerio from "cheerio";

export async function scrapeGeneric(company) {
  if (!company.careers_url) return [];

  console.log(`🌐 Generic scrape → ${company.name}`);

  const res = await fetch(company.careers_url);
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();

    if (!href || !text) return;
    if (!/job|career|opening|position/i.test(href + text)) return;

    jobs.push({
      company: company.name,
      title: text,
      location: "Unknown",
      url: href.startsWith("http") ? href : company.careers_url + href,
      ats: "generic"
    });
  });

  return jobs;
}
