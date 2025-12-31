import crypto from "crypto";

export async function scrapeGreenhouse(company) {
  try {
    if (!company?.careers_url) return [];

    let slug = company.careers_url;

    if (slug.includes("greenhouse.io")) {
      slug = slug.split("/").filter(Boolean).pop();
    }

    const api = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
    const res = await fetch(api);

    if (!res.ok) return [];

    const { jobs } = await res.json();
    if (!Array.isArray(jobs)) return [];

    return jobs.map((job) => ({
      source: "github-scraper",
      ats: "greenhouse",
      company: company.name,
      company_id: company.id,

      title: job.title,
      location: job.location?.name ?? "Unknown",
      department: job.departments?.[0]?.name ?? null,

      url: job.absolute_url,
      description: job.content ?? null,
      remote: job.location?.name?.toLowerCase().includes("remote") ?? false,
      posted_at: job.updated_at ?? null,

      fingerprint: crypto
        .createHash("sha256")
        .update(`greenhouse-${company.id}-${job.id}`)
        .digest("hex"),
    }));
  } catch (e) {
    console.error(`❌ Greenhouse failed for ${company.name}`, e);
    return [];
  }
}
