export default async function scrapeAshby(company) {
  try {
    console.log(`🟣 Ashby scraping started: ${company.name}`);

    // Ashby boards expose job IDs in HTML
    const res = await fetch(company.careers_url);
    const html = await res.text();

    // Extract Ashby job IDs
    const matches = html.match(/ashby_jid=([a-zA-Z0-9_-]+)/g) || [];

    const jobs = matches.map(m => ({
      job_id: m.split("=")[1],
      company: company.name,
      ats: "ashby"
    }));

    console.log(`🟢 ${company.name}: ${jobs.length} Ashby jobs found`);

    // OPTIONAL: log jobs
    for (const job of jobs) {
      console.log(`   • Job ID: ${job.job_id}`);
    }

  } catch (err) {
    console.error(`❌ Ashby scrape failed for ${company.name}`, err.message);
  }
}
