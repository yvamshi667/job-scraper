export async function ashby(company) {
  const jobs = [];

  try {
    const res = await fetch(company.careersUrl);
    const html = await res.text();

    // Ashby renders jobs client-side
    // We only collect job links here (safe + free)
    const matches = html.match(/\/jobs\/[a-zA-Z0-9-]+/g) || [];

    for (const path of new Set(matches)) {
      jobs.push({
        company: company.name,
        title: "Ashby Job",
        location: "See job page",
        url: new URL(path, company.careersUrl).href,
        ats: "ashby"
      });
    }
  } catch (err) {
    console.error(`❌ Ashby error (${company.name})`, err.message);
  }

  return jobs;
}
