const CAREER_PATHS = [
  "/careers",
  "/jobs",
  "/careers/jobs",
  "/company/careers"
];

export async function detectCareersPage(domain) {
  if (typeof domain !== "string") return null;

  const base = domain.replace(/\/$/, "");

  for (const path of CAREER_PATHS) {
    const url = base + path;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (_) {}
  }

  return null;
}
