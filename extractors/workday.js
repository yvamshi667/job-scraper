// extractors/workday.js

export async function scrapeWorkday(company) {
  const jobs = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${company.workday_url}?limit=${limit}&offset=${offset}`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!res.ok) {
      console.warn(`⚠️ ${company.name} Workday returned ${res.status}`);
      break;
    }

    const data = await res.json();
    const postings = data.jobPostings || [];

    if (postings.length === 0) break;

    for (const job of postings) {
      jobs.push({
        company: company.name,
        company_slug: company.slug,
        title: job.title,
        location: job.locations?.[0] ?? "Unknown",
        url: job.externalPath
          ? `https://${company.domain}${job.externalPath}`
          : null,
        source: "workday",
        posted_at: job.postedOn ?? null
      });
    }

    offset += limit;
  }

  return jobs;
}
