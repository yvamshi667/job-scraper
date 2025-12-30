import fetch from "node-fetch";

export async function scrapeGreenhouse(company) {
  const board = company.greenhouse_board;
  if (!board) return [];

  const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`;

  const res = await fetch(url);
  const data = await res.json();

  return data.jobs.map(job => ({
    company: company.name,
    title: job.title,
    location: job.location?.name || "Unknown",
    country: company.country,
    url: job.absolute_url,
    source: "greenhouse"
  }));
}
