export default async function scrapeAshby(company) {
  try {
    console.log(`🟣 Ashby scraping: ${company.name}`);

    const res = await fetch(company.careers_url);
    const html = await res.text();

    const matches = html.match(/ashby_jid=([a-zA-Z0-9_-]+)/g) || [];

    console.log(`🟢 ${company.name}: ${matches.length} Ashby jobs found`);

    for (const m of matches) {
      console.log("   • Job ID:", m.split("=")[1]);
    }
  } catch (err) {
    console.error(`❌ Ashby scrape failed for ${company.name}`, err.message);
  }
}
