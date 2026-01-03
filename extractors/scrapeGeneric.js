// extractors/scrapeGeneric.js
// Uses native fetch (Node 18+). NO external deps.

export async function scrapeGeneric(careersUrl, company) {
  const jobs = [];
  if (!careersUrl) return jobs;

  let res;
  try {
    res = await fetch(careersUrl, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 job-scraper" }
    });
  } catch {
    return jobs;
  }

  if (!res.ok) return jobs;

  const html = await res.text();
  const links = html.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];

  for (const link of links) {
    const href = link.match(/href="([^"]+)"/i)?.[1];
    const title = link.replace(/<[^>]+>/g, "").trim();

    if (!href || !title || title.length < 4) continue;

    const url = href.startsWith("http")
      ? href
      : new URL(href, careersUrl).toString();

    jobs.push({
      title: title.slice(0, 200),
      company: company?.name || "Unknown",
      location: null,
      description: null,
      url,
      country: company?.country || "US",
      ats_source: "generic",
      posted_at: new Date().toISOString(),
      is_active: true,
      last_seen_at: new Date().toISOString()
    });
  }

  return jobs;
}
