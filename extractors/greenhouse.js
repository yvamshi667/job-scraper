// extractors/greenhouse.js
import crypto from "crypto";

/**
 * Greenhouse public jobs API
 * https://boards-api.greenhouse.io/v1/boards/{company}/jobs
 */

export const scrapeGreenhouse = async (company) => {
  try {
    if (!company.careers_url) return [];

    let slug = company.careers_url;

    if (slug.includes("greenhouse.io")) {
      slug = slug.split("/").filter(Boolean).pop();
    }

    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    if (!json?.jobs?.length) return [];

    return json.jobs.map((job) => ({
      source: "github-scraper",
      ats: "greenhouse",
      company: company.name,
      company_id: company.id,

      title: job.title,
      location: job.location?.name || "Unknown",
      department: job.departments?.[0]?.name || null,
      employment_type: null,

      url: job.absolute_url,
      description: job.content || null,

      remote: Boolean(
        job.location?.name?.toLowerCase().includes("remote")
      ),

      posted_at: job.updated_at || null,

      fingerprint: crypto
        .createHash("sha256")
        .update(`greenhouse-${company.id}-${job.id}`)
        .digest("hex"),
    }));
  } catch (err) {
    console.error(`❌ Greenhouse failed for ${company.name}`, err);
    return [];
  }
};
