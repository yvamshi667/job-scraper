export async function detectCareersPage(domain) {
  const candidates = [
    `${domain}/careers`,
    `${domain}/jobs`,
    `${domain}/join`
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {}
  }

  return null;
}
