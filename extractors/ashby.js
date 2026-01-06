export async function scrapeAshby(company) {
  console.log(`🔍 Scraping ${company.name} (ashby)`);

  const res = await fetch(company.careers_url);
  const html = await res.text();

  const matches = [...html.matchAll(/"jobPostingUrl":"(https:[^"]+)"/g)];

  const jobs = matches.map(m => ({
    company: company.name,
    url: m[1],
    source: "ashby"
  }));

  console.log(`✅ ${company.name}: ${jobs.length} jobs`);
  return jobs;
}
