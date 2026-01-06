export async function greenhouse(company) {
  const jobs = [];

  if (!company.greenhouseToken) {
    console.warn(`⚠️ No greenhouse token for ${company.name}`);
    return jobs;
  }

  const url = `https://boards-api.greenhouse.io/v1/boards/${company.greenhouseToken}/jobs`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    for (const job of data.jobs || []) {
      jobs.push({
        company: company.name,
        title: job.title,
        location: job.location?.name || "Remote",
        url: job.absolute_url,
        ats: "greenhouse"
      });
    }
  } catch (err) {
    console.error(`❌ Greenhouse error (${company.name})`, err.message);
  }

  return jobs;
}
