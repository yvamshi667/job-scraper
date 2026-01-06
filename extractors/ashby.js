export default async function scrapeAshby(company) {
  try {
    console.log(`🟣 Ashby scraping: ${company.name}`);

    // Example Ashby API pattern
    // https://jobs.ashbyhq.com/api/non-user-graphql?opName=JobBoard

    const url = `${company.careers_url}?ashby_jid`;

    const res = await fetch(url);
    const html = await res.text();

    const matches = html.match(/ashby_jid=([a-zA-Z0-9_-]+)/g) || [];

    const jobs = matches.map(m => ({
      job_id: m.split("=")[1],
      company: company.name
    }));

    console.log(`🟢 ${company.name}: ${jobs.length} Ashby jobs found`);
  } catch (err) {
    console.error(`❌ Ashby scrape failed for ${company.name}`, err.message);
  }
}
