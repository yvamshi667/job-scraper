import fetch from "node-fetch";

export async function detectATS(domain) {
  const base = `https://${domain}`;

  const candidates = [
    "/careers",
    "/jobs",
    "/careers/jobs",
    "/company/careers"
  ];

  for (const path of candidates) {
    try {
      const url = base + path;
      const res = await fetch(url, { redirect: "follow" });
      const html = await res.text();

      if (html.includes("greenhouse.io")) {
        return {
          name: domain.split(".")[0],
          careers_url: url,
          ats_source: "greenhouse"
        };
      }

      if (html.includes("lever.co")) {
        return {
          name: domain.split(".")[0],
          careers_url: url,
          ats_source: "lever"
        };
      }

      if (html.includes("ashbyhq.com")) {
        return {
          name: domain.split(".")[0],
          careers_url: url,
          ats_source: "ashby"
        };
      }

      if (html.includes("workday")) {
        return {
          name: domain.split(".")[0],
          careers_url: url,
          ats_source: "workday"
        };
      }

      return {
        name: domain.split(".")[0],
        careers_url: url,
        ats_source: "generic"
      };
    } catch {
      continue;
    }
  }

  return null;
}
