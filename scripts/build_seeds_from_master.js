/**
 * Build ATS-specific master seeds from a big company master file.
 *
 * Input: seeds/companies-master.json
 * Each item should include at least one of:
 *  - careers_url (preferred)
 *  - greenhouse_company / lever_company / ashby_company (slugs)
 *
 * Output:
 *  - seeds/greenhouse-master.json
 *  - seeds/lever-master.json
 *  - seeds/ashby-master.json
 *
 * Detection rules:
 *  - Greenhouse URL: boards.greenhouse.io/<slug>
 *  - Lever URL: jobs.lever.co/<slug> or api.lever.co/v0/postings/<slug>
 *  - Ashby URL: jobs.ashbyhq.com/<slug> or api.ashbyhq.com/posting-api/job-board/<slug>
 *
 * Note:
 * - We do NOT try to discover slugs from company names.
 * - We classify based on URL patterns + a quick endpoint probe.
 */

import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const IN_FILE = process.env.IN_FILE || "seeds/companies-master.json";
const OUT_DIR = process.env.OUT_DIR || "seeds";

const inPath = path.resolve(process.cwd(), IN_FILE);
if (!fs.existsSync(inPath)) {
  console.error(`❌ Missing input: ${IN_FILE}`);
  process.exit(1);
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeSlug(s) {
  if (!s) return null;
  return String(s).trim().replace(/^\/+|\/+$/g, "");
}

function parseSlugFromUrl(url, hostContains) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes(hostContains)) return null;
    // pathname like /airbnb or /airbnb/jobs/123 etc
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length ? parts[0] : null;
  } catch {
    return null;
  }
}

async function probe(url) {
  try {
    const res = await axios.get(url, { timeout: 10000, validateStatus: () => true });
    return res.status; // 200/404/etc
  } catch {
    return 0;
  }
}

async function run() {
  const raw = fs.readFileSync(inPath, "utf8");
  const master = safeJsonParse(raw);

  if (!Array.isArray(master)) {
    console.error("❌ seeds/companies-master.json must be a JSON array");
    process.exit(1);
  }

  const greenhouse = [];
  const lever = [];
  const ashby = [];
  const unknown = [];

  for (const item of master) {
    const name = item?.name || "Unknown";

    // allow explicit slugs
    const ghExplicit = normalizeSlug(item?.greenhouse_company || item?.greenhouse_slug || item?.gh);
    const leverExplicit = normalizeSlug(item?.lever_company || item?.lever_slug);
    const ashbyExplicit = normalizeSlug(item?.ashby_company || item?.ashby_slug);

    // allow URL-based extraction
    const careersUrl = item?.careers_url || item?.url || "";
    const ghFromUrl = parseSlugFromUrl(careersUrl, "boards.greenhouse.io");
    const leverFromUrl = parseSlugFromUrl(careersUrl, "jobs.lever.co");
    const ashbyFromUrl = parseSlugFromUrl(careersUrl, "jobs.ashbyhq.com");

    const ghSlug = ghExplicit || ghFromUrl;
    const leverSlug = leverExplicit || leverFromUrl;
    const ashbySlug = ashbyExplicit || ashbyFromUrl;

    // quick classification by URL first
    if (ghSlug) {
      greenhouse.push({ name, greenhouse_company: ghSlug });
      continue;
    }
    if (leverSlug) {
      lever.push({ name, lever_company: leverSlug });
      continue;
    }
    if (ashbySlug) {
      ashby.push({ name, ashby_company: ashbySlug });
      continue;
    }

    // last resort: probe endpoints if user supplied a slug-like "company" field
    const candidate = normalizeSlug(item?.company || item?.slug);
    if (candidate) {
      // probe greenhouse
      const ghStatus = await probe(`https://boards-api.greenhouse.io/v1/boards/${candidate}/jobs?content=false`);
      if (ghStatus === 200) {
        greenhouse.push({ name, greenhouse_company: candidate });
        continue;
      }

      // probe lever
      const leverStatus = await probe(`https://api.lever.co/v0/postings/${candidate}?mode=json`);
      if (leverStatus === 200) {
        lever.push({ name, lever_company: candidate });
        continue;
      }

      // probe ashby
      const ashbyStatus = await probe(`https://api.ashbyhq.com/posting-api/job-board/${candidate}`);
      if (ashbyStatus === 200) {
        ashby.push({ name, ashby_company: candidate });
        continue;
      }
    }

    unknown.push({ name, careers_url: careersUrl || null });
  }

  fs.mkdirSync(path.resolve(process.cwd(), OUT_DIR), { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, "greenhouse-master.json"), JSON.stringify(greenhouse, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "lever-master.json"), JSON.stringify(lever, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "ashby-master.json"), JSON.stringify(ashby, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "unknown-master.json"), JSON.stringify(unknown, null, 2));

  console.log("✅ Input companies:", master.length);
  console.log("✅ Greenhouse:", greenhouse.length);
  console.log("✅ Lever:", lever.length);
  console.log("✅ Ashby:", ashby.length);
  console.log("⚠️ Unknown:", unknown.length);
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
