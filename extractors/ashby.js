import crypto from "crypto";

export default async function scrapeAshby(company) {
  try {
    let slug = company.careers_url;
    if (slug.includes("ashbyhq.com")) {
      slug = slug.split("/").filter(Boolean).pop();
    }

    const api = `https://jobs.ashbyhq.com/api/non-user-jobs?organizationSlug=${slug}`;
    const res = await fetch(api);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map(job => ({
      source: "github-scraper",
      ats: "ashby",
      company: company.name,
      company_id: company.id,

      title: job.title,
      location: job.location || "Unknown",
      department: job.department || null,

      url: `https://jobs.ashbyhq.com/${slug}/${job.id}`,
      description: job.descriptionPlain || null,
      remote: Boolean(job.isRemote),
      posted_at: job.publishedAt || null,

      fingerprint: crypto
        .createHash("sha256")
        .update(`ashby-${company.id}-${job.id}`)
        .digest("hex")
    }));
  } catch (e) {
    console.error(`❌ Ashby failed for ${company.name}`, e);
    return [];
  }
}
