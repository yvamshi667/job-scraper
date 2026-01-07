 // extractors/greenhouse.js
import fetch from "node-fetch";

export async function greenhouse(company) {
  const slug = company.greenhouse_company;

  if (!slug) {
    console.warn(`⚠️ Missing greenhouse_company for ${company.name}`);
    return [];
  }

  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Greenhouse API failed for ${company.name}`);
      return [];
    }

    const data = await res.json();

    return (data.jobs || []).map((job) => ({
      source: "greenhouse",
      company: company.name,
      title: job.title,
      location: job.location?.name || "Remote",
      url: job.absolute_url,
      description: job.content || "",
      posted_at: job.updated_at,
    }));
  } catch (err) {
    console.error(`❌ Error scraping ${company.name}`, err.message);
    return [];
  }
}
