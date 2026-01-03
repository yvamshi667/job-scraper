import fetch from "global-fetch";

export async function scrapeLever(company) {
  try {
    const res = await fetch(company.careers_url);
    const data = await res.json();

    return data.map(job => ({
      title: job.text,
      company: company.name,
      location: job.categories?.location || "Unknown",
      url: job.hostedUrl,
      ats_source: "lever",
      is_direct: true,
      is_active: true,
    }));
  } catch {
    return [];
  }
}
