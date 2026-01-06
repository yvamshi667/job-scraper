export default async function scrapeGeneric(company) {
  try {
    const res = await fetch(company.careers_url);
    if (!res.ok) return [];

    const html = await res.text();

    const matches = [...html.matchAll(/href="(\/jobs\/[^"]+)"/gi)];

    return matches.map(m => ({
      company: company.name,
      title: "Job Opening",
      location: "Unknown",
      url: new URL(m[1], company.careers_url).href,
      platform: "generic"
    }));
  } catch (err) {
    console.error("❌ Generic scrape failed:", err.message);
    return [];
  }
}
