export async function scrapeLever(company) {
  const slug = company.careers_url.split("/").pop();
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return data.map(job => ({
    title: job.text,
    company: company.name,
    location: job.categories?.location || null,
    description: job.description || null,
    url: job.hostedUrl,
    country: company.country || "US",
    ats_source: "lever",
  }));
}
