export default async function scrapeAshby(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map(job => ({
      company: company.name,
      title: job.title,
      location: job.location || "Remote",
      url: job.url,
      platform: "ashby"
    }));
  } catch (err) {
    console.error("❌ Ashby scrape failed:", err.message);
    return [];
  }
}
