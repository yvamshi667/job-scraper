export async function ashby(company) {
  if (!company.ashby_slug) {
    console.warn(`⚠️  No Ashby slug for ${company.name}`);
    return [];
  }

  const url = `https://jobs.ashbyhq.com/api/non_user_jobs?organizationSlug=${company.ashby_slug}`;

  console.log(`🟣 Ashby API → ${company.name}`);

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`❌ Ashby failed for ${company.name}`);
    return [];
  }

  const data = await res.json();

  return data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location ?? "Remote",
    url: `https://jobs.ashbyhq.com/${company.ashby_slug}/${job.id}`,
    ats: "ashby"
  }));
}
