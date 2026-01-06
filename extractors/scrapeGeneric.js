import cheerio from "cheerio";

export default async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url);
  if (!res.ok) {
    console.warn(`⚠️ ${company.name} returned ${res.status}`);
    return [];
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");

    if (!title || !href) return;
    if (title.length < 5) return;

    jobs.push({
      company: company.name,
      title,
      url: href.startsWith("http")
        ? href
        : `${company.domain}${href}`
    });
  });

  return jobs;
}
