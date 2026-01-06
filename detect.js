const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/careers/jobs",
  "/join",
  "/about/careers",
];

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

export async function detectCareersPage(domain) {
  if (typeof domain !== "string") {
    throw new Error(`Expected domain string, got ${typeof domain}`);
  }

  const base = domain.replace(/\/$/, "");

  for (const path of CAREER_PATHS) {
    const url = base + path;

    const t = withTimeout(8000);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: t.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JobScraperBot/1.0)",
          "Accept": "text/html",
        },
      });

      if (res.ok) {
        return {
          careers_url: url,
          ats: "generic",
        };
      }
    } catch (e) {
      // ignore timeouts, 403s, etc
    } finally {
      t.clear();
    }
  }

  return null;
}
