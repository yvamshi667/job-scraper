import fetch from "node-fetch";

/**
 * Detects a company's careers page and ATS type
 */
export async function detectCareersPage(companyUrl) {
  const checks = [
    { type: "greenhouse", path: "/careers" },
    { type: "greenhouse", path: "/jobs" },
    { type: "ashby", path: "/careers" },
    { type: "lever", path: "/jobs" }
  ];

  for (const check of checks) {
    const url = companyUrl.replace(/\/$/, "") + check.path;

    try {
      const res = await fetch(url, { redirect: "follow" });

      if (!res.ok) continue;

      const html = await res.text();

      if (html.includes("greenhouse.io")) {
        return {
          name: extractName(companyUrl),
          homepage: companyUrl,
          careers_url: url,
          ats: "greenhouse"
        };
      }

      if (html.includes("ashbyhq.com")) {
        return {
          name: extractName(companyUrl),
          homepage: companyUrl,
          careers_url: url,
          ats: "ashby"
        };
      }

      if (html.includes("lever.co")) {
        return {
          name: extractName(companyUrl),
          homepage: companyUrl,
          careers_url: url,
          ats: "lever"
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractName(url) {
  return url
    .replace(/^https?:\/\//, "")
    .replace("www.", "")
    .split(".")[0]
    .toUpperCase();
}
