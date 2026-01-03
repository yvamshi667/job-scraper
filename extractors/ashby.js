export async function scrapeAshby(company) {
  const url = `${company.careers_url}/api/non-user-jobs`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.jobs || []).map(job => ({
    title: job.title,
    company: company.name,
    location: job.location || null,
    description: job.description || null,
    url: job.jobUrl,
    country: company.country || "US",
    ats_source: "ashby",
  }));
}
