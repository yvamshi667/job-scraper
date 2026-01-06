// extractors/scrapeAshby.js
import * as cheerio from "cheerio";

function absUrl(base, href) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return base.replace(/\/+$/, "") + "/" + href.replace(/^\/+/, "");
}

function parseNextData(html) {
  // Ashby job boards are Next.js and embed JSON in __NEXT_DATA__
  const $ = cheerio.load(html);
  const jsonText = $("#__NEXT_DATA__").first().text();
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractJobsFromNextData(nextData, baseUrl, companyName) {
  const jobs = [];

  // The exact shape can vary; we do a deep scan for "jobPosting" objects.
  const stack = [nextData];
  const seen = new Set();

  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (seen.has(node)) continue;
    seen.add(node);

    // Heuristic: objects that look like job postings
    // Common keys: title, location, team, employmentType, id, slug, jobId, etc.
    if (
      typeof node.title === "string" &&
      (node.location || node.locations || node.team || node.department || node.compensation || node.employmentType)
    ) {
      // Build a reasonable URL if we can
      // Many Ashby boards include "jobPostingId" or "id" + slug-like fields
      const title = node.title?.trim();
      const location =
        (typeof node.location === "string" && node.location) ||
        (Array.isArray(node.locations) && node.locations.map((x) => x?.name || x).filter(Boolean).join(", ")) ||
        "";

      // Try to find a URL field
      const url =
        node.url ||
        node.applyUrl ||
        node.jobUrl ||
        node.absoluteUrl ||
        node.jobPostingUrl ||
        "";

      const finalUrl = url ? url : baseUrl; // fallback

      // Keep only meaningful rows
      if (title && title.length > 1) {
        jobs.push({
          company: companyName,
          title,
          location,
          url: finalUrl,
          ats: "ashby",
          source: "ashby_next_data"
        });
      }
    }

    // traverse
    for (const v of Object.values(node)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }

  // If we didn’t get URLs from JSON, fallback: parse all job links on page
  if (!jobs.some((j) => j.url && j.url.includes("ashbyhq.com"))) {
    const $ = cheerio.load(nextData?.html || "");
    const links = $("a[href]").map((_, a) => $(a).attr("href")).get();
    const jobLinks = [...new Set(links)]
      .filter((h) => h && h.includes("/job") || h.includes("/jobs"))
      .slice(0, 500);

    return jobLinks.map((h) => ({
      company: companyName,
      title: "",
      location: "",
      url: absUrl(baseUrl, h),
      ats: "ashby",
      source: "ashby_links_fallback"
    }));
  }

  // Dedup by title+url
  const uniq = new Map();
  for (const j of jobs) {
    const key = (j.title || "") + "|" + (j.url || "");
    if (!uniq.has(key)) uniq.set(key, j);
  }
  return Array.from(uniq.values());
}

export default async function scrapeAshby(company) {
  const careersUrl = company.careers_url;

  // Ashby job board is usually https://jobs.ashbyhq.com/<company>
  const res = await fetch(careersUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    }
  });

  const finalUrl = res.url || careersUrl;
  const html = await res.text();

  const nextData = parseNextData(html);

  // If __NEXT_DATA__ not present, still do link scraping
  if (!nextData) {
    const $ = cheerio.load(html);
    const links = $("a[href]").map((_, a) => $(a).attr("href")).get();
    const jobLinks = [...new Set(links)]
      .map((h) => absUrl(finalUrl, h))
      .filter((u) => u.includes("ashbyhq.com") && u.includes("/job"))
      .slice(0, 1000);

    return jobLinks.map((u) => ({
      company: company.name,
      title: "",
      location: "",
      url: u,
      ats: "ashby",
      source: "ashby_link_only"
    }));
  }

  return extractJobsFromNextData(nextData, finalUrl, company.name);
}
