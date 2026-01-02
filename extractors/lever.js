import crypto from "crypto";

export default async function scrapeLever(company) {
  try {
    let slug = company.careers_url;
    if (slug.includes("lever.co")) {
      slug = slug.split("/").filter(Boolean).pop();
    }

    const api = `https://api.lever.co/v0/postings/${slug}?mode=json`;
    const res = await fetch(api);
    if (!res.ok) return [];

    const jobs = await res.json();
    if (!Array.isArray(jobs)) return [];

    return jobs.map(job => ({
      source: "github-scraper",
      ats: "lever",
      company: company.name,
      company_id: company.id,

      title: job.text,
      location: job.categories?.location || "Unknown",
      department: job.categories?.team || null,

      url: job.hostedUrl,
      description: job.descriptionPlain || null,
      remote: job.categories?.location?.toLowerCase().includes("remote") || false,
      posted_at: job.createdAt || null,

      fingerprint: crypto
        .createHash("sha256")
        .update(`lever-${company.id}-${job.id}`)
        .digest("hex")
    }));
  } catch (e) {
    console.error(`❌ Lever failed for ${company.name}`, e);
    return [];
  }
}
