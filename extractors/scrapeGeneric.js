// extractors/scrapeGeneric.js
import * as cheerio from "cheerio";

function absUrl(base, href) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return base.replace(/\/+$/, "") + "/" + href.replace(/^\/+/, "");
}

export default async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    }
  });

  const finalUrl = res.url || company.careers_url;
  const html = await res.text();

  const $ = cheerio.load(html);

  const links = $("a[href]")
    .map((_, a) => $(a).attr("href"))
    .get()
    .map((h) => absUrl(finalUrl, h))
    .filter(Boolean);

  // naive filter: keep only "job-ish" links
  const jobLinks = [...new Set(links)]
    .filter((u) => {
      const x = u.toLowerCase();
      return (
        x.includes("/job") ||
        x.includes("/jobs") ||
        x.includes("greenhouse.io") ||
        x.includes("lever.co") ||
        x.includes("ashbyhq.com") ||
        x.includes("myworkdayjobs.com")
      );
    })
    .slice(0, 2000);

  return jobLinks.map((u) => ({
    company: company.name,
    title: "",
    location: "",
    url: u,
    ats: company.ats || "generic",
    source: "generic_links"
  }));
}
