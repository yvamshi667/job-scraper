export default async function scrapeLever(company) {
  const url = `https://jobs.lever.co/v0/postings/${company.slug}?mode=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map(job => ({
    title: job.text,
    company: company.name,
    location: job.categories?.location || "Remote",
    url: job.hostedUrl,
    description: job.description || "",
    ats_source: "lever",
    country: company.country || "US",
    is_active: true,
    is_direct: true
  }));
}
