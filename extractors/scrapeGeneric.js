import * as cheerio from "cheerio";

const JOB_PATH_REGEX = /(job|career|position|opening|apply)/i;

export default async function scrapeGeneric(company) {
  if (!company.careers_url) {
    console.warn(`⚠️ No careers_url for ${company.name}`);
    return [];
  }

  try {
    const res = await fetch(company.careers_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 JobScraperBot"
      }
    });

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
      if (title.length < 4) return;
      if (!JOB_PATH_REGEX.test(href)) return;

      const url = href.startsWith("http")
        ? href
        : new URL(href, company.careers_url).href;

      jobs.push({
        company: company.name,
        title,
        location: "Unknown",
        apply_url: url,
        source: "generic"
      });
    });

    return jobs;
  } catch (err) {
    console.error(`❌ Generic scrape failed for ${company.name}`, err);
    return [];
  }
}
