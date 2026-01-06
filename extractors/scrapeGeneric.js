import * as cheerio from "cheerio";
import slugify from "slugify";

function isLikelyJobLink(href) {
  if (!href) return false;
  const h = href.toLowerCase();
  return (
    h.includes("/jobs") ||
    h.includes("/careers") ||
    h.includes("job") ||
    h.includes("positions") ||
    h.includes("openings")
  );
}

export async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url, {
    headers: { "user-agent": "Mozilla/5.0 job-scraper-bot" }
  });

  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);

  const links = new Set();

  $("a").each((_, a) => {
    const href = $(a).attr("href");
    if (!href) return;

    if (!isLikelyJobLink(href)) return;

    try {
      const u = new URL(href, company.careers_url);
      links.add(u.toString());
    } catch (_) {}
  });

  const now = new Date().toISOString();

  return [...links].slice(0, 500).map((url) => ({
    job_id: `generic_${company.name}_${slugify(url, { lower: true })}`,
    company: company.name,
    company_domain: company.domain,
    ats: "generic",
    title: null,
    location: null,
    employment_type: null,
    apply_url: url,
    posted_at: null,
    scraped_at: now
  }));
}
