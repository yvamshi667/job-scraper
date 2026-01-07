// extractors/ashby.js
import fetch from "node-fetch";

export async function ashby(company) {
  if (!company.ashby_company) {
    console.warn(`⚠️ Missing ashby_company for ${company.name}`);
    return [];
  }

  const url = `https://jobs.ashbyhq.com/api/non-user-jobs/${company.ashby_company}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Ashby API failed for ${company.name}`);
      return [];
    }

    const data = await res.json();

    return (data.jobs || []).map((job) => ({
      source: "ashby",
      company: company.name,
      title: job.title,
      location: job.location || "Remote",
      url: `https://jobs.ashbyhq.com/${company.ashby_company}/${job.id}`,
      description: job.descriptionPlain || "",
      posted_at: job.publishedAt,
    }));
  } catch (err) {
    console.error(`❌ Error scraping Ashby for ${company.name}`, err.message);
    return [];
  }
}
