// extractors/greenhouse.js
// Node 20+ compatible (uses native fetch)

export async function greenhouse(company) {
  if (!company || !company.greenhouse_slug) {
    console.warn(`⚠️ Missing greenhouse_slug for ${company?.name}`);
    return [];
  }

  const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_slug}/jobs`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.warn(
        `⚠️ Greenhouse API failed for ${company.name} (${response.status})`
      );
      return [];
    }

    const data = await response.json();

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
  } catch (error) {
    console.error(
      `❌ Greenhouse scrape error for ${company.name}:`,
      error.message
    );
    return [];
  }
}
