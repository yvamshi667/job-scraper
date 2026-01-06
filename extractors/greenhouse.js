export async function scrapeGreenhouse(company) {
  if (!company?.greenhouse_id) {
    console.warn(`⚠️ ${company.name}: missing greenhouse_id`);
    return [];
  }

  console.log(`🔍 Scraping ${company.name} (greenhouse)`);

  const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_id}/jobs`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data?.jobs) return [];

  const jobs = data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location?.name || "",
    url: job.absolute_url,
    source: "greenhouse"
  }));

  console.log(`✅ ${company.name}: ${jobs.length} jobs`);
  return jobs;
}
