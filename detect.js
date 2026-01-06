export async function detectCareersPage(domain) {
  const candidates = [
    "/careers",
    "/jobs",
    "/join",
    "/careers/jobs"
  ];

  for (const path of candidates) {
    const url = domain.replace(/\/$/, "") + path;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {}
  }

  return null;
}
