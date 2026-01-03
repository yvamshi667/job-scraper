export async function scrapeLever(company) {
  const api = `${company.careers_url}?mode=json`;
  const res = await fetch(api);
  if (!res.ok) return [];

  const json = await res.json();

  return json.map(j => ({
    title: j.text,
    company: company.name,
    location: j.categories?.location || null,
    url: j.hostedUrl,
    country: company.country || "US",
    ats_source: "lever"
  }));
}
