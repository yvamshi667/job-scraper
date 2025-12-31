import fetch from "node-fetch";

export default async function scrapeAshby(company) {
  try {
    const slug = company.careers_url
      .replace("https://jobs.ashbyhq.com/", "")
      .replace("/", "");

    const url = `https://jobs.ashbyhq.com/api/non-user-graphql`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "PublicJobs",
        variables: { organizationHostedJobsPageName: slug },
        query: `
          query PublicJobs($organizationHostedJobsPageName: String!) {
            organizationHostedJobsPage(
              organizationHostedJobsPageName: $organizationHostedJobsPageName
            ) {
              jobPostings {
                id
                title
                locationName
                descriptionHtml
                jobUrl
              }
            }
          }
        `,
      }),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const jobs =
      json?.data?.organizationHostedJobsPage?.jobPostings || [];

    return jobs.map((job) => ({
      title: job.title,
      company: company.name,
      location: job.locationName || "Unknown",
      url: job.jobUrl,
      description: job.descriptionHtml || "",
      country: company.country || "US",
      ats_source: "ashby",
      is_direct: true,
      is_active: true,
    }));
  } catch (err) {
    console.error("❌ Ashby error:", err.message);
    return [];
  }
}
