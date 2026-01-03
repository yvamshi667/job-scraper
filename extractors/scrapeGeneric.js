import * as cheerio from "cheerio";

const JOB_PATH_REGEX = /(job|career|opening|position|apply)/i;
const BLOCKLIST = [
  "signin", "login", "privacy", "terms", "cookie",
  "language", "contact", "about", "help", "support"
];

export default async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();

    if (!href || !text) return;

    const lower = href.toLowerCase();

    if (!JOB_PATH_REGEX.test(lower)) return;
    if (BLOCKLIST.some(b => lower.includes(b))) return;

    const url = href.startsWith("http")
      ? href
      : new URL(href, company.careers_url).href;

    jobs.push({
      company: company.name,
      title: text,
      url,
      source: "generic",
      created_at: new Date().toISOString()
    });
  });

  return jobs;
}
