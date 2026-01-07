export async function lever(company) {
  const slug = company.lever_company;
  if (!slug) return [];

  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();

    return data.map(job => ({
      source: "lever",
      company: company.name,
      title: job.text,
      location: job.categories?.location || "Unknown",
      url: job.hostedUrl,
      updated_at: job.updatedAt
        ? new Date(job.updatedAt).toISOString()
        : new Date().toISOString()
    }));
  } catch {
    return [];
  }
}
