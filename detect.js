// detect.js
// Node 20+ has global fetch. No node-fetch required.

const CAREERS_PATHS = [
  "/careers",
  "/careers/",
  "/jobs",
  "/jobs/",
  "/careers/jobs",
  "/careers/jobs/",
  "/company/careers",
  "/company/careers/",
  "/about/careers",
  "/about/careers/"
];

function toDomainString(domainLike) {
  if (!domainLike) return "";
  if (typeof domainLike === "string") return domainLike;
  // if someone passed {domain: "..."} or {website: "..."}
  return domainLike.domain || domainLike.website || domainLike.url || "";
}

function normalizeBaseUrl(input) {
  let s = toDomainString(input).trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s.replace(/\/+$/, "");
}

function detectATSFromHtml(html, finalUrl = "") {
  const h = (html || "").toLowerCase();
  const u = (finalUrl || "").toLowerCase();

  if (u.includes("jobs.ashbyhq.com") || h.includes("jobs.ashbyhq.com")) return "ashby";
  if (u.includes("boards.greenhouse.io") || h.includes("boards.greenhouse.io")) return "greenhouse";
  if (u.includes("jobs.lever.co") || h.includes("jobs.lever.co")) return "lever";
  if (u.includes("myworkdayjobs.com") || h.includes("myworkdayjobs.com")) return "workday";
  if (u.includes("icims.com") || h.includes("icims.com")) return "icims";

  return "generic";
}

export async function detectCareersPage(domainLike) {
  const base = normalizeBaseUrl(domainLike);
  if (!base) return null;

  // Fast path: if base itself is already a careers/jobs page
  if (base.includes("/careers") || base.includes("/jobs")) {
    return { careers_url: base, ats: "generic" };
  }

  for (const path of CAREERS_PATHS) {
    const url = base + path;

    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
        }
      });

      // Some sites 403 but still reveal ATS via redirect URL
      const finalUrl = res.url || url;

      if (!res.ok && res.status !== 403) continue;

      const html = await res.text().catch(() => "");
      const ats = detectATSFromHtml(html, finalUrl);

      // If page content looks real enough OR we got redirected
      const looksValid =
        finalUrl !== url ||
        (html && html.length > 500 && (html.toLowerCase().includes("career") || html.toLowerCase().includes("job")));

      if (looksValid) {
        return { careers_url: finalUrl, ats };
      }
    } catch {
      // ignore and keep trying
    }
  }

  return null;
}
