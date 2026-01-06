export async function greenhouse(company) {
  if (!company.greenhouse_token) {
    console.warn(`⚠️  No greenhouse token for ${company.name}`);
    return [];
  }

  const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouse_token}/jobs`;

  console.log(`🌱 Greenhouse API → ${company.name}`);

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`❌ Greenhouse failed for ${company.name}`);
    return [];
  }

  const data = await res.json();

  return data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location?.name ?? "Remote",
    url: job.absolute_url,
    ats: "greenhouse"
  }));
}
