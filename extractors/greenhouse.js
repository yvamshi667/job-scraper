// extractors/scrapeGreenhouse.js
// Node 20+ compatible — uses native fetch (NO node-fetch)

export async function scrapeGreenhouse(company) {
  if (!company || !company.greenhouse_slug) {
    console.warn(`⚠️ Greenhouse slug missing for ${company?.name}`);
    return [];
  }

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_slug}/jobs`;

  try {
    const res = await fetch(apiUrl);

    if (!res.ok) {
      console.warn(`⚠️ Greenhouse API failed for ${company.name}: ${res.status}`);
      return [];
    }

    const data = await res.json();

    if (!data.jobs || !Array.isArray(data.jobs)) {
      return [];
    }

    return data.jobs.map(job => ({
      company: company.name,
      title: job.title,
      location: job.location?.name || "Unknown",
      url: job.absolute_url,
      ats: "greenhouse"
    }));
  } catch (err) {
    console.error(`❌ Greenhouse scrape error for ${company.name}`, err.message);
    return [];
  }
}
