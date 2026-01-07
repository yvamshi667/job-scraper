// extractors/scrapeGithub.js
import fetch from "node-fetch";

const GITHUB_API =
  "https://api.github.com/search/repositories?q=jobs+language:javascript&sort=updated&order=desc&per_page=50";

export async function scrapeGithub() {
  console.log("🐙 Scraping GitHub jobs...");

  const res = await fetch(GITHUB_API, {
    headers: {
      "User-Agent": "job-scraper",
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API failed: ${res.status}`);
  }

  const data = await res.json();

  const jobs = (data.items || []).map((repo) => ({
    source: "github",
    company: repo.owner.login,
    title: repo.name,
    location: "Remote",
    url: repo.html_url,
    description: repo.description || "",
    posted_at: repo.updated_at,
  }));

  console.log(`✅ GitHub: ${jobs.length} jobs`);
  return jobs;
}
