export default async function scrapeLever(company) {
  try {
    const slug = company.careers_url.split("/").pop();
    const apiUrl = `https://api.lever.co/v0/postings/${slug}?mode=json`;

    const res = await fetch(apiUrl);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map(job => ({
      title: job.text,
      company: company.name,
      location: job.categories?.location || null,
      url: job.hostedUrl,
      country: company.country || "US",
      ats_source: "lever"
    }));
  } catch (err) {
    console.error(`Lever scrape failed for ${company.name}`, err.message);
    return [];
  }
}
