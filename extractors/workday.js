// extractors/workday.js
export default async function scrapeWorkday(company) {
  const { name, careers_url } = company;

  // Workday companies always expose a JSON endpoint
  // We convert careers page → API endpoint
  // Example:
  // https://uber.wd1.myworkdayjobs.com/External_Career_Site
  // → https://uber.wd1.myworkdayjobs.com/wday/cxs/uber/External_Career_Site/jobs

  const url = careers_url.replace(
    /\/([^/]+)$/,
    "/wday/cxs/$1/jobs"
  );

  console.log(`🧠 Workday API → ${name}`);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    console.warn(`⚠️ ${name} Workday returned ${res.status}`);
    return [];
  }

  const data = await res.json();
  const jobs = data?.jobPostings || [];

  return jobs.map(j => ({
    company: name,
    title: j.title,
    location: j.locations?.[0]?.displayName || "Unknown",
    url: j.externalPath
      ? `${careers_url}${j.externalPath}`
      : careers_url,
    source: "workday",
    posted_at: j.postedOn || null
  }));
}
