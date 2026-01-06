import cheerio from "cheerio";

export async function scrapeGeneric(company) {
  if (!company?.careers_url) {
    console.warn(`⚠️ ${company.name}: missing careers_url`);
    return [];
  }

  console.log(`🔍 Scraping ${company.name} (generic)`);

  const res = await fetch(company.careers_url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs = [];
  const base = new URL(company.careers_url).origin;

  $("a").each((_, el) => {
    let href = $(el).attr("href");

    if (!href) return;
    if (href === "#" || href.startsWith("javascript")) return;

    // Normalize relative URLs
    if (href.startsWith("/")) {
      href = base + href;
    }

    // Final validation
    try {
      new URL(href);
    } catch {
      return;
    }

    // Heuristic: job-like links only
    if (!href.match(/job|career|position|opening/i)) return;

    jobs.push({
      company: company.name,
      url: href,
      source: "generic"
    });
  });

  console.log(`✅ ${company.name}: ${jobs.length} jobs`);
  return jobs;
}
