import fetch from "node-fetch";

/**
 * Try common career paths
 */
const PATHS = [
  "/careers",
  "/jobs",
  "/careers/jobs",
  "/company/careers"
];

export async function detectCareersPage(domain) {
  for (const path of PATHS) {
    const url = domain.replace(/\/$/, "") + path;

    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) {
        return url;
      }
    } catch (_) {
      // ignore
    }
  }
  return null;
}
