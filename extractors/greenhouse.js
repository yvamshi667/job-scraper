import fetch from "node-fetch";

export default async function scrapeGreenhouse(company) {
  const jobs = [];

  const base = company.careers_url.replace(/\/$/, "");
  const apiUrl = `${base}.json`;

  console.log(`Calling Greenhouse API: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.log(`❌ Greenhouse API failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.log("❌ No jobs array returned from Greenhouse");
      return [];
    }

    for (const job of data.jobs) {
      jobs.push({
        title: job.title,
        company: company.name,
        location: job.location?.name || "Unknown",
        country: company.country || "US",
        url: job.absolute_url,
        description: job.content || "",
        ats_source: "greenhouse",
        is_direct: true,
        is_active: true,
      });
    }

    console.log(`✅ ${jobs.length} jobs found for ${company.name}`);
    return jobs;
  } catch (err) {
    console.error("❌ Greenhouse error:", err.message);
    return [];
  }
}
