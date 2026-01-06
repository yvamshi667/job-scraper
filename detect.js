export async function detectCareersPage(domain) {
  if (typeof domain !== "string") return null;

  const paths = [
    "/careers",
    "/jobs",
    "/join",
    "/careers/jobs"
  ];

  for (const path of paths) {
    const url = domain.replace(/\/$/, "") + path;

    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (_) {}
  }

  return null;
}
