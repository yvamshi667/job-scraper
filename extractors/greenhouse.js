import fetch from "node-fetch";

export default async function scrapeGreenhouse(company) {
  try {
    const slug = company.careers_url
      .replace("https://boards.greenhouse.io/", "")
      .replace("/", "");

    const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.jobs) return [];

    return data.jobs.map((job) => ({
      title: job.title,
      company: company.name,
      location: job.location?.name || "Unknown",
      url: job.absolute_url,
      description: job.content || "",
      country: company.country || "US",
      ats_source: "greenhouse",
      is_direct: true,
      is_active: true,
    }));
  } catch (err) {
    console.error("❌ Greenhouse error:", err.message);
    return [];
  }
}
