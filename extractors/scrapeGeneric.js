// extractors/scrapeGeneric.js
// Node 20 has native fetch — NO imports needed

export async function scrapeGeneric(careersUrl, company) {
  const jobs = [];

  if (!careersUrl) return jobs;

  let html = "";
  try {
    const res = await fetch(careersUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 job-scraper"
      }
    });

    if (!res.ok) return jobs;
    html = await res.text();
  } catch {
    return jobs;
  }

  // Very light generic parsing (safe fallback)
  const matches = html.match(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi) || [];

  for (const m of matches) {
    const urlMatch = m.match(/href="([^"]+)"/i);
    const titleMatch = m.replace(/<[^>]+>/g, "").trim();

    if (!urlMatch || !titleMatch) continue;
    if (titleMatch.length < 4) continue;

    const jobUrl = urlMatch[1].startsWith("http")
      ? urlMatch[1]
      : new URL(urlMatch[1], careersUrl).toString();

    jobs.push({
      title: titleMatch.slice(0, 200),
      company: company?.name || "Unknown",
      location: null,
      description: null,
      url: jobUrl,
      country: company?.country || "US",
      employment_type: null,
      experience_level: null,
      salary_min: null,
      salary_max: null,
      currency: "USD",
      remote_allowed: false,
      visa_sponsor: false,
      ats_source: "generic",
      posted_at: new Date().toISOString(),
      is_active: true,
      is_direct: true,
      last_seen_at: new Date().toISOString()
    });
  }

  return jobs;
}
