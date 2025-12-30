export async function scrapeGreenhouse(company) {
  const slug = company.career_url.split("/").pop();
  const api = `https://boards.greenhouse.io/${slug}.json`;

  const res = await fetch(api);
  const data = await res.json();

  return data.jobs.map(j => ({
    company: company.name,
    title: j.title,
    location: j.location?.name || "N/A",
    apply_url: j.absolute_url,
    source_url: company.career_url,
    country: company.country
  }));
}
