import fetch from "node-fetch";

export default async function scrapeGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Greenhouse request failed");

  const data = await res.json();

  if (!data.jobs) return [];

  return data.jobs.map(j => ({
    id: j.id,
    title: j.title,
    location: j.location?.name || "",
    url: j.absolute_url,
    updated_at: j.updated_at
  }));
}
