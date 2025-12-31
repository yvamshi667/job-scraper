// extractors/ashby.js
import crypto from "crypto";

/**
 * Ashby public jobs API
 * https://jobs.ashbyhq.com/api/non-user-jobs?organizationSlug=company
 */

export const scrapeAshby = async (company) => {
  try {
    if (!company.careers_url) return [];

    let slug = company.careers_url;

    if (slug.includes("ashbyhq.com")) {
      slug = slug.split("/").filter(Boolean).pop();
    }

    const url = `https://jobs.ashbyhq.com/api/non-user-jobs?organizationSlug=${slug}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    if (!json?.jobs?.length) return [];

    return json.jobs.map((job) => ({
      source: "github-scraper",
      ats: "ashby",
      company: company.name,
      company_id: company.id,

      title: job.title,
      location: job.location || "Unknown",
      department: job.department || null,
      employment_type: job.employmentType || null,

      url: `https://jobs.ashbyhq.com/${slug}/${job.id}`,
      description: job.descriptionPlain || null,

      remote: Boolean(job.isRemote),
      posted_at: job.publishedAt || null,

      fingerprint: crypto
        .createHash("sha256")
        .update(`ashby-${company.id}-${job.id}`)
        .digest("hex"),
    }));
  } catch (err) {
    console.error(`❌ Ashby failed for ${company.name}`, err);
    return [];
  }
};
