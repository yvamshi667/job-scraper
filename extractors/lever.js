export async function scrapeLever(company) {
  const url = `https://jobs.lever.co/v0/postings/${company.slug}?mode=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();

  return data.map(job => ({
    company: company.name,
    title: job.text,
    location: job.categories?.location || "Unknown",
    country: company.country || "US",
    url: job.hostedUrl,
    source: "LEVER"
  }));
}
