export default async function scrapeWorkday(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map(job => ({
      company: company.name,
      title: job.title,
      location: job.primaryLocation || "Remote",
      url: job.externalPath,
      platform: "workday"
    }));
  } catch (err) {
    console.error("❌ Workday scrape failed:", err.message);
    return [];
  }
}
