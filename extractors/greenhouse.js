export default async function scrapeGreenhouse(company) {
  try {
    const url = company.careers_url;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Greenhouse returned ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!data.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs.map(job => ({
      company: company.name,
      title: job.title,
      location: job.location?.name || "Remote",
      url: job.absolute_url,
      platform: "greenhouse"
    }));
  } catch (err) {
    console.error("❌ Greenhouse scrape failed:", err.message);
    return [];
  }
}
