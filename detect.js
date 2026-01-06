import fetch from "node-fetch";

const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/careers/jobs",
  "/join",
  "/about/careers"
];

export async function detectCareersPage(domain) {
  if (typeof domain !== "string") {
    throw new Error(`detectCareersPage expected string, got ${typeof domain}`);
  }

  const base = domain.replace(/\/$/, "");

  for (const path of CAREER_PATHS) {
    const url = base + path;

    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        timeout: 8000
      });

      if (res.ok) {
        return {
          careers_url: url,
          ats: "generic"
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}
