import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const IN_FILE = process.env.IN_FILE || "seeds/us-orgs-100k-enriched.json";
const OUT_DIR = process.env.OUT_DIR || "seeds";

const LIMIT = Number(process.env.LIMIT || 100000);
const MAX_CHECKS = Number(process.env.MAX_CHECKS || 20000);
const SLEEP_MS = Number(process.env.SLEEP_MS || 250);
const MAX_PAGES_PER_ORG = Number(process.env.MAX_PAGES_PER_ORG || 4);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractDomain(url) {
  try {
    if (!url) return null;
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizeUrl(u) {
  try {
    if (!u) return null;
    const url = new URL(u);
    return url.toString();
  } catch {
    return null;
  }
}

function absUrl(base, maybeRelative) {
  try {
    if (!maybeRelative) return null;
    const b = new URL(base);
    return new URL(maybeRelative, b).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      timeout: 20_000,
      validateStatus: () => true,
      headers: { "User-Agent": "job-scraper/1.0" },
    });

    if (res.status >= 200 && res.status < 400) {
      const html =
        typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      return { ok: true, status: res.status, html };
    }
    return { ok: false, status: res.status, html: "" };
  } catch {
    return { ok: false, status: 0, html: "" };
  }
}

function detectAtsFromHtml(html) {
  const h = (html || "").toLowerCase();

  if (h.includes("boards.greenhouse.io") || h.includes("greenhouse.io"))
    return "greenhouse";
  if (h.includes("jobs.lever.co") || h.includes("api.lever.co")) return "lever";
  if (h.includes("jobs.ashbyhq.com") || h.includes("ashbyhq.com"))
    return "ashby";
  if (h.includes("myworkdayjobs.com")) return "workday";

  return null;
}

function extractSlugFromAtsLink(html, atsType) {
  const regexMap = {
    greenhouse: /https?:\/\/boards\.greenhouse\.io\/([a-z0-9\-_]+)/i,
    lever: /https?:\/\/jobs\.lever\.co\/([a-z0-9\-_]+)/i,
    ashby: /https?:\/\/jobs\.ashbyhq\.com\/([a-z0-9\-_]+)/i,
  };

  const re = regexMap[atsType];
  if (!re) return null;

  const m = (html || "").match(re);
  if (!m) return null;
  return m[1];
}

function findCareersLinks(html, baseUrl) {
  const out = new Set();
  const re = /href\s*=\s*["']([^"']+)["']/gi;

  let m;
  while ((m = re.exec(html || ""))) {
    const href = m[1];
    if (!href) continue;
    const low = href.toLowerCase();

    if (
      low.includes("careers") ||
      low.includes("/jobs") ||
      low.includes("job-openings") ||
      low.includes("join-us") ||
      low.includes("work-with-us")
    ) {
      const full = absUrl(baseUrl, href);
      if (full) out.add(full);
    }
    if (out.size >= 10) break;
  }

  return Array.from(out);
}

async function detectAtsForOrg(website) {
  const site = normalizeUrl(website);
  if (!site) return { type: "unknown", slug: null, careers_url: null };

  const domain = extractDomain(site);
  if (!domain) return { type: "unknown", slug: null, careers_url: null };

  const base = site.replace(/\/$/, "");
  const candidates = [
    `${base}/careers`,
    `${base}/jobs`,
    `${base}/careers/jobs`,
    `${base}/about/careers`,
  ];

  for (const url of candidates.slice(0, MAX_PAGES_PER_ORG)) {
    const { ok, html } = await fetchHtml(url);
    if (!ok) continue;

    const ats = detectAtsFromHtml(html);
    if (ats) {
      const slug = extractSlugFromAtsLink(html, ats);
      return { type: ats, slug, careers_url: url };
    }

    const links = findCareersLinks(html, url).slice(0, MAX_PAGES_PER_ORG);
    for (const link of links) {
      const r = await fetchHtml(link);
      if (!r.ok) continue;

      const ats2 = detectAtsFromHtml(r.html);
      if (ats2) {
        const slug2 = extractSlugFromAtsLink(r.html, ats2);
        return { type: ats2, slug: slug2, careers_url: link };
      }
    }
  }

  return { type: "unknown", slug: null, careers_url: null };
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Build ATS seeds from enriched US orgs (HTML detection)");
  console.log("Input:", IN_FILE);
  console.log("Output dir:", OUT_DIR);
  console.log("====================================================");

  const list = JSON.parse(fs.readFileSync(path.resolve(IN_FILE), "utf8"));

  const greenhouse = [];
  const lever = [];
  const ashby = [];
  const workday = [];
  const unknown = [];

  let checks = 0;

  for (let i = 0; i < Math.min(list.length, LIMIT); i++) {
    const item = list[i];
    const website = item?.website;
    if (!website) continue;

    if (checks >= MAX_CHECKS) break;
    checks++;

    const ats = await detectAtsForOrg(website);
    await sleep(SLEEP_MS);

    if (ats.type === "greenhouse" && ats.slug)
      greenhouse.push({ name: item.name, greenhouse_company: ats.slug });
    else if (ats.type === "lever" && ats.slug)
      lever.push({ name: item.name, lever_company: ats.slug });
    else if (ats.type === "ashby" && ats.slug)
      ashby.push({ name: item.name, ashby_company: ats.slug });
    else if (ats.type === "workday")
      workday.push({ name: item.name, website });
    else unknown.push({ name: item.name, website, careers_url: ats.careers_url });

    if (checks % 200 === 0) {
      console.log(
        `✅ checks=${checks} GH=${greenhouse.length} Lever=${lever.length} Ashby=${ashby.length} Workday=${workday.length} Unknown=${unknown.length}`
      );
    }
  }

  fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "greenhouse-master.json"),
    JSON.stringify(greenhouse, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "lever-master.json"),
    JSON.stringify(lever, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "ashby-master.json"),
    JSON.stringify(ashby, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "workday-master.json"),
    JSON.stringify(workday, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "unknown-master.json"),
    JSON.stringify(unknown, null, 2)
  );

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Greenhouse:", greenhouse.length);
  console.log("Lever:", lever.length);
  console.log("Ashby:", ashby.length);
  console.log("Workday:", workday.length);
  console.log("Unknown:", unknown.length);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
