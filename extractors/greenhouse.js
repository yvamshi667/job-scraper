export default async function scrapeGreenhouse(company) {
  try {
    const slug = company.careers_url.split("/").pop();
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

    const res = await fetch(apiUrl);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs.map(job => ({
      title: job.title,
      company: company.name,
      location: job.location?.name || null,
      url: job.absolute_url,
      country: company.country || "US",
      ats_source: "greenhouse"
    }));
  } catch (err) {
    console.error(`Greenhouse scrape failed for ${company.name}`, err.message);
    return [];
  }
}
