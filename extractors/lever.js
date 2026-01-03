export default async function scrapeLever(company) {
  const api =
    company.careers_url
      .replace("https://jobs.lever.co/", "https://api.lever.co/v0/postings/")
      + "?mode=json";

  const res = await fetch(api);
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map(job => ({
    company: company.name,
    title: job.text,
    url: job.hostedUrl,
    location: job.categories?.location || "Unknown",
    source: "lever",
    created_at: new Date().toISOString()
  }));
}
