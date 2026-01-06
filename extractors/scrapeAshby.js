import slugify from "slugify";

function getOrgFromAshbyUrl(careersUrl) {
  // https://jobs.ashbyhq.com/<org>
  const u = new URL(careersUrl);
  const parts = u.pathname.split("/").filter(Boolean);
  return parts[0] || null;
}

async function ashbyGraphQL(org, cursor = null) {
  const endpoint = "https://jobs.ashbyhq.com/api/non-user-graphql";

  const query = `
    query JobBoardWithTeamsAndJobs($organizationHostedJobsPageName: String!, $cursor: String) {
      jobBoard: jobBoardWithTeamsAndJobs(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
        teams {
          name
          jobs {
            id
            title
            locationName
            employmentType
            createdAt
            updatedAt
            hostedUrl
          }
        }
        jobPostings(first: 200, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              title
              locationName
              employmentType
              createdAt
              updatedAt
              hostedUrl
            }
          }
        }
      }
    }
  `;

  const variables = {
    organizationHostedJobsPageName: org,
    cursor
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 job-scraper-bot"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    throw new Error(`Ashby GraphQL failed: ${res.status}`);
  }

  return res.json();
}

export async function scrapeAshby(company) {
  const org = getOrgFromAshbyUrl(company.careers_url);
  if (!org) return [];

  const all = [];
  let cursor = null;
  let safety = 0;

  while (safety++ < 25) {
    const data = await ashbyGraphQL(org, cursor);

    const jb = data?.data?.jobBoard;
    if (!jb) break;

    // Prefer jobPostings (paginated)
    const edges = jb?.jobPostings?.edges || [];
    for (const e of edges) {
      const j = e.node;
      if (!j?.hostedUrl) continue;

      all.push({
        id: j.id,
        title: j.title,
        location: j.locationName || null,
        type: j.employmentType || null,
        url: j.hostedUrl,
        posted_at: j.createdAt || null,
        updated_at: j.updatedAt || null
      });
    }

    const pageInfo = jb?.jobPostings?.pageInfo;
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  // normalize
  const now = new Date().toISOString();
  return all.map((j) => ({
    job_id: `ashby_${company.name}_${slugify(j.id || j.url, { lower: true })}`,
    company: company.name,
    company_domain: company.domain,
    ats: "ashby",
    title: j.title,
    location: j.location,
    employment_type: j.type,
    apply_url: j.url,
    posted_at: j.posted_at,
    scraped_at: now
  }));
}
