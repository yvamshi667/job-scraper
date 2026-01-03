export default async function scrapeAshby(company) {
  try {
    const apiUrl = company.careers_url.replace(
      /\/?$/,
      "/jobs.json"
    );

    const res = await fetch(apiUrl);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map(job => ({
      title: job.title,
      company: company.name,
      location: job.location || null,
      url: job.url,
      country: company.country || "US",
      ats_source: "ashby"
    }));
  } catch (err) {
    console.error(`Ashby scrape failed for ${company.name}`, err.message);
    return [];
  }
}
