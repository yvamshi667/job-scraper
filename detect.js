// detect.js (root)
export function normalizeDomain(input) {
  try {
    const u = input.startsWith("http") ? new URL(input) : new URL(`https://${input}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function detectATS({ careersUrl, html = "" }) {
  const url = (careersUrl || "").toLowerCase();
  const body = (html || "").toLowerCase();

  if (url.includes("greenhouse.io") || body.includes("greenhouse")) return "greenhouse";
  if (url.includes("lever.co") || body.includes("lever")) return "lever";
  if (url.includes("ashbyhq.com") || body.includes("ashby")) return "ashby";
  if (url.includes("myworkdayjobs.com") || body.includes("workday")) return "workday";

  return "generic";
}
