// detect.js (Node 20+ has global fetch)

export function normalizeDomain(domain) {
  if (!domain) return null;
  if (typeof domain !== "string") return null;

  let d = domain.trim();
  if (!d) return null;

  if (!d.startsWith("http://") && !d.startsWith("https://")) {
    d = "https://" + d;
  }
  return d.replace(/\/$/, "");
}

export function detectATSFromUrl(url) {
  if (!url) return "generic";
  const u = url.toLowerCase();

  if (u.includes("boards.greenhouse.io")) return "greenhouse";
  if (u.includes("jobs.lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("myworkdayjobs.com") || u.includes("/wd3/")) return "workday";
  if (u.includes("smartrecruiters.com")) return "smartrecruiters";

  return "generic";
}

export async function detectCareersPage(domain) {
  const base = normalizeDomain(domain);
  if (!base) return null;

  const paths = [
    "/careers",
    "/jobs",
    "/join-us",
    "/join",
    "/about/careers",
    "/company/careers",
    "/careers/jobs"
  ];

  for (const path of paths) {
    const url = base + path;

    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "user-agent": "Mozilla/5.0 job-scraper-bot" }
      });

      if (!res.ok) continue;

      const finalUrl = res.url || url;

      // If redirect goes to known ATS, we can detect instantly
      const ats = detectATSFromUrl(finalUrl);

      return { careers_url: finalUrl, ats };
    } catch (_) {
      // ignore
    }
  }

  return null;
}
