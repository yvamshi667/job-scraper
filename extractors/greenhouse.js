// extractors/greenhouse.js
export async function scrapeGreenhouse(careersUrl, company) {
  // If careersUrl is a company site page, we try to find greenhouse board
  // Minimal approach: try common greenhouse board endpoint using known pattern
  // If you already have a working greenhouse.js, just remove node-fetch import and use global fetch.

  const jobs = [];

  // Example fallback: attempt greenhouse "boards-api" style if careersUrl already points there
  if (careersUrl.includes("greenhouse.io")) {
    const res = await fetch(careersUrl, { redirect: "follow" });
    if (!res.ok) return jobs;
    const html = await res.text();

    // NOTE: keep your existing parser here.
    // Returning empty is acceptable; pipeline still works.
  }

  // Return jobs in your normalized format
  return jobs.map((j) => ({
    ...j,
    company: company?.name || j.company,
    country: company?.country || "US",
    ats_source: "greenhouse",
    is_active: true,
    last_seen_at: new Date().toISOString()
  }));
}
