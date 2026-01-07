// extractors/scrapeGithub.js
import fetch from "node-fetch";

export async function scrapeGithub() {
  console.log("🐙 Scraping GitHub jobs...");

  const url =
    "https://api.github.com/search/repositories?q=hiring+jobs&sort=updated&order=desc&per_page=50";

  const res = await fetch(url, {
    headers: {
      "User-Agent": "job-scraper",
      Accept: "application/vnd.github+json",
    },
  });

  const data = await res.json();

  return (data.items || []).map((repo) => ({
    source: "github",
    company: repo.owner.login,
    title: repo.name,
    location: "Remote",
    url: repo.html_url,
    description: repo.description || "",
    posted_at: repo.updated_at,
  }));
}
