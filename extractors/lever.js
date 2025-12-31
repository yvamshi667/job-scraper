import fetch from "node-fetch";

export default async function scrapeLever(company) {
  const jobs = [];

  try {
    const res = await fetch(`https://api.lever.co/v0/postings/${company.slug}?mode=json`);
    if (!res.ok) return [];

    const data = await res.json();

    for (const job of data) {
      jobs.push({
        title: job.text,
        company: company.name,
        location: job.categories?.location || "Unknown",
        apply_url: job.hostedUrl,
        ats_source: "lever",
        country: company.country || "US",
      });
    }
  } catch (err) {
    console.error("Lever error:", company.name, err.message);
  }

  return jobs;
}
