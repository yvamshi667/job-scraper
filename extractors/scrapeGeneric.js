import fetch from "node-fetch";
import * as cheerio from "cheerio";

/**
 * Strict job URL filter
 */
function isValidJobLink(href) {
  if (!href) return false;

  const h = href.toLowerCase();

  // ✅ allow job-like paths only
  const allow = [
    "/jobs",
    "/job/",
    "/careers",
    "/positions",
    "/roles",
    "/apply"
  ];

  // ❌ block junk links
  const block = [
    "login",
    "signin",
    "sign-in",
    "privacy",
    "terms",
    "cookies",
    "language",
    "help",
    "contact",
    "blog",
    "press",
    "about",
    "developers",
    "api",
    "support",
    "status",
    "download",
    "extension"
  ];

  if (!allow.some(a => h.includes(a))) return false;
  if (block.some(b => h.includes(b))) return false;

  return true;
}

/**
 * Generic career page scraper
 */
export default async function scrapeGeneric(company) {
  const url = company.careers_url;

  try {
    const res = await fetch(url, {
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
    const seen = new Set();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      let title = $(el).text().trim();

      if (!isValidJobLink(href)) return;
      if (!title || title.length < 4) return;

      // normalize relative URLs
      if (href.startsWith("/")) {
        href = new URL(href, url).toString();
      }

      if (seen.has(href)) return;
      seen.add(href);

      jobs.push({
        company: company.name,
        title,
        url: href,
        source: "generic",
        location: "US",
        created_at: new Date().toISOString()
      });
    });

    return jobs;
  } catch (err) {
    console.error(`❌ Generic scrape failed for ${company.name}`, err);
    return [];
  }
}
