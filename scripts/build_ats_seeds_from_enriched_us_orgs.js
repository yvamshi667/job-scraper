import fs from "node:fs";
import path from "node:path";
import axios from "axios";

const IN_FILE = process.env.IN_FILE || "seeds/us-orgs-100k-enriched.json";
const OUT_DIR = process.env.OUT_DIR || "seeds";
const LIMIT = Number(process.env.LIMIT || 100000);
const MAX_CHECKS = Number(process.env.MAX_CHECKS || 20000);
const SLEEP_MS = Number(process.env.SLEEP_MS || 120);

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

async function probe(url) {
  try {
    const res = await axios.get(url, { timeout: 15_000, validateStatus: () => true });
    return res.status;
  } catch {
    return 0;
  }
}

async function detectATS(domain) {
  // This is a lightweight “signal probe” approach.
  // For real accuracy at scale, you'd use search/discovery, but this is a strong starting baseline.
  // We'll attempt common career paths and see if they redirect/contain ATS patterns.

  const candidates = [
    `https://${domain}/careers`,
    `https://${domain}/jobs`,
    `https://${domain}/careers/jobs`,
    `https://${domain}/about/careers`
  ];

  for (const u of candidates) {
    const status = await probe(u);
    if (status >= 200 && status < 400) {
      // We could fetch HTML and parse for greenhouse/lever/ashby, but that's heavier.
      // For now, return "unknown" with the careers page found.
      return { type: "unknown", careers_url: u };
    }
  }

  return { type: "unknown", careers_url: null };
}

async function run() {
  console.log("====================================================");
  console.log("🚀 Build ATS seeds from enriched US orgs");
  console.log("Input:", IN_FILE);
  console.log("Output dir:", OUT_DIR);
  console.log("====================================================");

  const list = JSON.parse(fs.readFileSync(path.resolve(IN_FILE), "utf8"));

  const greenhouse = [];
  const lever = [];
  const ashby = [];
  const unknown = [];

  let checks = 0;

  for (let i = 0; i < Math.min(list.length, LIMIT); i++) {
    const item = list[i];
    const domain = extractDomain(item.website);
    if (!domain) continue;

    if (checks >= MAX_CHECKS) break;
    checks++;

    const ats = await detectATS(domain);
    await sleep(SLEEP_MS);

    // Right now detection is “careers url exists”. Next phase: parse HTML for exact ATS.
    if (ats.type === "greenhouse") greenhouse.push({ name: item.name, greenhouse_company: ats.slug });
    else if (ats.type === "lever") lever.push({ name: item.name, lever_company: ats.slug });
    else if (ats.type === "ashby") ashby.push({ name: item.name, ashby_company: ats.slug });
    else unknown.push({ name: item.name, website: item.website, careers_url: ats.careers_url });

    if ((i + 1) % 1000 === 0) {
      console.log(`✅ processed=${i + 1} checks=${checks} unknown=${unknown.length}`);
    }
  }

  fs.mkdirSync(path.resolve(OUT_DIR), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "greenhouse-master.json"), JSON.stringify(greenhouse, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "lever-master.json"), JSON.stringify(lever, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "ashby-master.json"), JSON.stringify(ashby, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "unknown-master.json"), JSON.stringify(unknown, null, 2));

  console.log("====================================================");
  console.log("✅ DONE");
  console.log("Greenhouse:", greenhouse.length);
  console.log("Lever:", lever.length);
  console.log("Ashby:", ashby.length);
  console.log("Unknown:", unknown.length);
  console.log("====================================================");
}

run().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
