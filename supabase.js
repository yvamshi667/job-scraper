// supabase.js
// Works in Node 20+ (GitHub Actions) with ESM.
// Safe when env vars are missing; no import-time crashes.

import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

// Your Edge Function endpoint (Lovable/Supabase)
const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : "";

// ---------- Helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function dedupeByKey(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) continue; // skip items without key
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

// Convert weird date values to ISO string (prevents "date/time out of range")
function normalizeDateValue(v) {
  if (v == null) return v;

  // already ISO-like
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;

    // If it's a big numeric string, treat as epoch
    if (/^\d{10,16}$/.test(trimmed)) {
      const n = Number(trimmed);
      return normalizeDateValue(n);
    }

    // If Date parses it, keep it as ISO to be safe
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString();

    return v; // fallback
  }

  // numeric epoch seconds/millis
  if (typeof v === "number") {
    let ms = v;
    // if seconds (10 digits-ish), convert to ms
    if (v < 1e12) ms = v * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }

  return v;
}

function normalizeJob(job) {
  if (!job || typeof job !== "object") return job;

  const out = { ...job };

  // Normalize common date fields (safe even if your schema differs)
  const dateFields = [
    "created_at",
    "updated_at",
    "posted_at",
    "date_posted",
    "first_seen_at",
    "last_seen_at",
    "scraped_at",
    "expires_at",
  ];

  for (const f of dateFields) {
    if (f in out) out[f] = normalizeDateValue(out[f]);
  }

  // Ensure fingerprint exists if your pipeline expects it
  // (If you already compute fingerprint elsewhere, this won't change it.)
  // If missing, try to derive something stable:
  if (!out.fingerprint) {
    const parts = [
      out.company_id,
      out.company,
      out.source,
      out.ats,
      out.external_id,
      out.req_id,
      out.id,
      out.url,
      out.apply_url,
      out.title,
      out.location,
    ].filter(Boolean);
    if (parts.length) out.fingerprint = parts.join("|");
  }

  return out;
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

// ---------- API ----------

/**
 * Fetch active companies from Supabase.
 * IMPORTANT: Uses `active=eq.true` as you confirmed.
 */
export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️  Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
    );
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/companies?active=eq.true&select=*`;

  const res = await fetch(url, {
    method: "GET",
    headers: supabaseHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("❌ getCompanies failed:", res.status, text);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Insert a single job directly via REST (optional helper).
 * If you don’t use this, it’s still exported so imports won’t break.
 */
export async function insertJob(job) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("⚠️  Supabase env vars missing. insertJob skipped.");
    return { ok: false, error: "Missing env vars" };
  }

  const payload = normalizeJob(job);

  // NOTE: adjust table name if yours differs
  const url = `${SUPABASE_URL}/rest/v1/jobs`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify([payload]),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: text || `HTTP ${res.status}` };
  }

  return { ok: true };
}

/**
 * Send jobs to Supabase Edge Function ingest-jobs.
 * - Sends payload as { jobs: [...] } (fixes "No jobs provided")
 * - Batches (default 200)
 * - Dedupes by fingerprint within each batch (fixes ON CONFLICT row second time)
 */
export async function sendJobs(jobs, opts = {}) {
  const batchSize = Number(opts.batchSize || 200);
  const maxRetries = Number(opts.maxRetries || 3);
  const retryDelayMs = Number(opts.retryDelayMs || 800);

  if (!WEBHOOK_URL) {
    console.warn("⚠️  SUPABASE_URL missing. sendJobs skipped.");
    return { ok: false, sent: 0, failedBatches: 0, error: "Missing SUPABASE_URL" };
  }
  if (!SCRAPER_SECRET_KEY) {
    console.warn("⚠️  SCRAPER_SECRET_KEY missing. sendJobs skipped.");
    return { ok: false, sent: 0, failedBatches: 0, error: "Missing SCRAPER_SECRET_KEY" };
  }

  const input = Array.isArray(jobs) ? jobs : [];
  const normalized = input.map(normalizeJob);

  // Global dedupe by fingerprint first (reduces repeats across batches)
  const globallyDeduped = dedupeByKey(normalized, (j) => j?.fingerprint);

  console.log(`✅ TOTAL jobs scraped: ${input.length}`);
  console.log(`🧹 Deduplicated jobs: ${input.length} → ${globallyDeduped.length}`);
  console.log(`🚀 Sending ${globallyDeduped.length} jobs in batches of ${batchSize}`);

  const batches = chunkArray(globallyDeduped, batchSize);

  let sentCount = 0;
  let failedBatches = 0;

  for (let i = 0; i < batches.length; i++) {
    // Per-batch dedupe (this is the key fix for ON CONFLICT row second time)
    const batch = dedupeByKey(batches[i], (j) => j?.fingerprint);

    if (!batch.length) {
      console.warn(`⚠️ Batch ${i + 1}/${batches.length} empty after dedupe; skipping`);
      continue;
    }

    let ok = false;
    let lastErr = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-scraper-key": SCRAPER_SECRET_KEY, // IMPORTANT header name
          },
          // IMPORTANT: Edge function expects { jobs: [...] }
          body: JSON.stringify({ jobs: batch }),
        });

        const text = await res.text().catch(() => "");
        if (!res.ok) {
          lastErr = text || `HTTP ${res.status}`;
          throw new Error(lastErr);
        }

        // success
        ok = true;
        sentCount += batch.length;

        // If response is JSON, we can log it (optional)
        if (text) {
          try {
            const parsed = JSON.parse(text);
            console.log(`✅ Batch ${i + 1}/${batches.length} sent`, parsed);
          } catch {
            console.log(`✅ Batch ${i + 1}/${batches.length} sent`);
          }
        } else {
          console.log(`✅ Batch ${i + 1}/${batches.length} sent`);
        }

        break;
      } catch (e) {
        const msg = e?.message || String(e);
        console.warn(`❌ Batch ${i + 1}/${batches.length} attempt ${attempt} failed: ${msg}`);
        if (attempt < maxRetries) await sleep(retryDelayMs * attempt);
      }
    }

    if (!ok) {
      failedBatches++;
      console.error(`❌ Batch ${i + 1}/${batches.length} permanently failed: ${lastErr}`);
    }
  }

  if (failedBatches === 0) {
    console.log("🎉 ALL JOBS SENT SUCCESSFULLY");
  } else {
    console.warn(`⚠️ Completed with failures: failedBatches=${failedBatches}`);
  }

  return { ok: failedBatches === 0, sent: sentCount, failedBatches };
}
