import fetch from "node-fetch";

export default async function scrapeLever(company) {
  const jobs = [];

  const apiUrl = `${company.careers_url.replace(/\/$/, "")}?mode=json`;
  console.log(`Calling Lever API: ${apiUrl}`);

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.log(`❌ Lever API failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      console.log("❌ No jobs array returned from Lever");
      return [];
    }

    for (const job of data) {
      jobs.push({
        title: job.text,
        company: company.name,
        location: job.categories?.location || "Unknown",
        country: company.country || "US",
        url: job.hostedUrl,
        description: job.descriptionPlain || "",
        ats_source: "lever",
        is_direct: true,
        is_active: true,
      });
    }

    console.log(`✅ ${jobs.length} jobs found for ${company.name}`);
    return jobs;
  } catch (err) {
    console.error("❌ Lever error:", err.message);
    return [];
  }
}
