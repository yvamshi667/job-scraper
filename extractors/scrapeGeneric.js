// extractors/scrapeGeneric.js

import { JSDOM } from "jsdom";

const JOB_URL_REGEX = /(\/jobs\/|\/careers\/|\/apply\/|\/job\/|\/positions\/)/i;
const BLOCKLIST_REGEX =
  /(login|signin|privacy|terms|contact|language|cookie|help|about|extension|download)/i;

function isValidJobLink(href, title) {
  if (!href || !title) return false;

  if (!JOB_URL_REGEX.test(href)) return false;
  if (BLOCKLIST_REGEX.test(href)) return false;

  if (title.length < 6) return false;
  if (title.length > 120) return false;

  return true;
}

function absolutize(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return null;
  }
}

export async function scrapeGeneric(company) {
  const res = await fetch(company.careers_url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const anchors = [...document.querySelectorAll("a")];
  const jobs = [];

  for (const a of anchors) {
    const href = a.getAttribute("href");
    const title = a.textContent?.trim();

    if (!isValidJobLink(href, title)) continue;

    const url = absolutize(href, company.careers_url);
    if (!url) continue;

    jobs.push({
      company_id: company.id,
      title,
      url,
      location: null,
      source: "generic",
    });
  }

  return jobs;
}
