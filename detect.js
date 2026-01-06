export async function detectCareersPage(domain) {
  const candidates = [
    "/careers",
    "/jobs",
    "/join",
    "/careers/jobs"
  ];

  for (const path of candidates) {
    try {
      const res = await fetch(domain + path, { method: "HEAD" });
      if (res.ok) return domain + path;
    } catch (_) {}
  }

  return null;
}
