import fetch from "node-fetch";

export default async function scrapeLever(company) {
  try {
    const slug = company.careers_url
      .replace("https://jobs.lever.co/", "")
      .replace("/", "");

    const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((job) => ({
      title: job.text,
      company: company.name,
      location: job.categories?.location || "Unknown",
      url: job.hostedUrl,
      description: job.description || "",
      country: company.country || "US",
      ats_source: "lever",
      is_direct: true,
      is_active: true,
    }));
  } catch (err) {
    console.error("❌ Lever error:", err.message);
    return [];
  }
}
