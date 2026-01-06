export async function detectCareersPage(domain) {
  const candidates = [
    "/careers",
    "/jobs",
    "/careers/jobs",
    "/about/careers"
  ];

  for (const path of candidates) {
    const url = `${domain.replace(/\/$/, "")}${path}`;

    try {
      const res = await fetch(url, { redirect: "follow" });

      if (res.ok) {
        return {
          careersUrl: url,
          ats: "generic"
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}
