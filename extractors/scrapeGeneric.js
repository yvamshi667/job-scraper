// extractors/scrapeGeneric.js
// Node.js 18+ has native fetch — NO imports required

export async function scrapeGeneric(careersUrl, company) {
  const jobs = [];
  if (!careersUrl) return jobs;

  let html;
  try {
    const res = await fetch(careersUrl, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 job-scraper" }
    });
    if (!res.ok) return jobs;
    html = await res.text();
  } catch {
    return jobs;
  }

  const links = html.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];

  for (const link of links) {
    const urlMatch = link.match(/href="([^"]+)"/i);
    const title = link.replace(/<[^>]+>/g, "").trim();

    if (!urlMatch || !title || title.length < 4) continue;

    const jobUrl = urlMatch[1].startsWith("http")
      ? urlMatch[1]
      : new URL(urlMatch[1], careersUrl).toString();

    jobs.push({
      title: title.slice(0, 200),
      company: company?.name || "Unknown",
      location: null,
      description: null,
      url: jobUrl,
      country: company?.country || "US",
      ats_source: "generic",
      posted_at: new Date().toISOString(),
      is_active: true,
      last_seen_at: new Date().toISOString()
    });
  }

  return jobs;
}
