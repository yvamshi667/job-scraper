export async function greenhouse(company) {
  const domain = company.domain;

  if (!domain) {
    console.warn(`⚠️ No domain for ${company.name}`);
    return [];
  }

  const boardUrl = `https://${domain}/boards/embed/job_board?for=${company.name.toLowerCase()}`;

  try {
    const res = await fetch(boardUrl);
    if (!res.ok) {
      console.warn(`⚠️ Greenhouse board not accessible for ${company.name}`);
      return [];
    }

    const html = await res.text();

    const matches = [...html.matchAll(/href="(\/jobs\/\d+)"/g)];

    const jobs = matches.map(m => ({
      company: company.name,
      source: "greenhouse",
      url: `https://${domain}${m[1]}`
    }));

    console.log(`✅ ${company.name}: ${jobs.length} jobs`);
    return jobs;

  } catch (err) {
    console.error(`❌ Greenhouse error for ${company.name}`, err.message);
    return [];
  }
}
