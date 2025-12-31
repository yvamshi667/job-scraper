// extractors/ashby.js
import fetch from "node-fetch";
import crypto from "crypto";

/**
 * Ashby careers pages use a JSON endpoint:
 * https://jobs.ashbyhq.com/api/non-user-jobs?organizationSlug=COMPANY
 */

export async function scrapeAshby(company) {
  const jobs = [];

  try {
    // Accept either full URL or slug
    let slug = company.careers_url;

    if (slug.includes("ashbyhq.com")) {
      slug = slug.split("/").pop();
    }

    const endpoint = `https://jobs.ashbyhq.com/api/non-user-jobs?organizationSlug=${slug}`;

    const res = await fetch(endpoint);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data?.jobs) return [];

    for (const job of data.jobs) {
      const jobUrl = `https://jobs.ashbyhq.com/${slug}/${job.id}`;

      jobs.push({
        source: "github-scraper",
        ats: "ashby",
        company: company.name,
        company_id: company.id,

        title: job.title,
        location: job.location || "Unknown",
        department: job.department || null,
        employment_type: job.employmentType || null,

        url: jobUrl,
        description: job.descriptionPlain || null,

        remote: job.isRemote || false,
        posted_at: job.publishedAt || null,

        fingerprint: crypto
          .createHash("sha256")
          .update(`${company.id}-${job.id}`)
          .digest("hex")
      });
    }
  } catch (err) {
    console.error(`❌ Ashby scrape failed for ${company.name}`, err);
  }

  return jobs;
}
