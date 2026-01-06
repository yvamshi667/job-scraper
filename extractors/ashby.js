/**
 * Ashby ATS scraper
 * Works with Ashby public job board API
 * Node 20+ compatible (uses native fetch)
 */

export default async function scrapeAshby(company) {
  try {
    if (!company?.careers_url) return [];

    /**
     * Ashby careers URLs look like:
     * https://jobs.ashbyhq.com/{company}
     * https://boards.greenhouse.io/ashby-style (sometimes proxied)
     */

    const ashbyBase = extractAshbyBase(company.careers_url);
    if (!ashbyBase) {
      console.log(`⚠️ ${company.name} is not a valid Ashby URL`);
      return [];
    }

    const apiUrl = `${ashbyBase}/jobs`;

    const res = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      console.log(`⚠️ Ashby API failed for ${company.name}`);
      return [];
    }

    const data = await res.json();

    if (!data?.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    const jobs = data.jobs.map(job => ({
      company: company.name,
      title: job.title,
      location: job.location?.name || "Remote",
      url: `${ashbyBase}/job/${job.id}`,
      ats: "ashby"
    }));

    return jobs;

  } catch (err) {
    console.error(`❌ Ashby scrape error for ${company?.name}`, err.message);
    return [];
  }
}

/**
 * Converts careers URL → Ashby API base
 */
function extractAshbyBase(url) {
  try {
    const u = new URL(url);

    // jobs.ashbyhq.com/company
    if (u.hostname.includes("ashbyhq.com")) {
      return `${u.protocol}//${u.hostname}${u.pathname.replace(/\/$/, "")}`;
    }

    return null;
  } catch {
    return null;
  }
}
