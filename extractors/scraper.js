import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const SEED_FILE = process.env.SEED_FILE || "seeds/greenhouse-us.json";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "greenhouse_jobs";
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 250);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase env vars");
  process.exit(1);
}

const seedPath = path.resolve(process.cwd(), SEED_FILE);
if (!fs.existsSync(seedPath)) {
  console.error("❌ Seed file not found:", seedPath);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeSlug(c) {
  return c.greenhouse_company || c.slug || c.company || null;
}

async function fetchJobs(slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  const res = await axios.get(url, { timeout: 30000 });
  return Array.isArray(res.data?.jobs) ? res.data.jobs : [];
}

function mapJob(company, job) {
  return {
    job_key: `${company.slug}:${job.id}`,
    company_name: company.name,
    company_slug: company.slug,
    greenhouse_job_id: job.id,
    title: job.title,
    location_name: job.location?.name ?? null,
    url: job.absolute_url,
    content_html: job.content,
    departments: job.departments ? JSON.stringify(job.departments) : null,
    offices: job.offices ? JSON.stringify(job.offices) : null,
    updated_at_source: job.updated_at,
    created_at_source: job.created_at,
    ingested_at: new Date().toISOString(),
    source: "greenhouse",
    is_active: true
  };
}

async function run() {
  const companies = JSON.parse(fs.readFileSync(seedPath, "utf8"))
    .map((c) => ({
      name: c.name || c.greenhouse_company,
      slug: normalizeSlug(c)
    }))
    .filter((c) => c.slug);

  console.log("🏢 Companies:", companies.length);

  for (const company of companies) {
    console.log("🔎", company.slug);
    await sleep(REQUEST_DELAY_MS);

    const jobs = await fetchJobs(company.slug);
    const rows = jobs.map((j) => mapJob(company, j));

    if (rows.length) {
      const { error } = await supabase
        .from(SUPABASE_TABLE)
        .upsert(rows, { onConflict: "job_key" });

      if (error) throw error;
      console.log("💾 Upserted:", rows.length);
    }
  }
}

run().catch((e) => {
  console.error("❌ Fatal:", e);
  process.exit(1);
});
