// supabase.js (ROOT)
export function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

export function functionsBaseUrl() {
  const base = requireEnv("SUPABASE_FUNCTIONS_BASE_URL"); // e.g. https://xxxx.supabase.co/functions/v1
  // validate URL
  new URL(base);
  return base.replace(/\/+$/, "");
}

export async function getCompanies() {
  const base = functionsBaseUrl();
  const key = requireEnv("SCRAPER_SECRET_KEY");

  const url = `${base}/get-companies`;
  const res = await fetch(url, { headers: { "x-scraper-key": key } });

  if (!res.ok) throw new Error(`get-companies failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return Array.isArray(json?.companies) ? json.companies : [];
}

export async function ingestJobs(jobs) {
  const base = functionsBaseUrl();
  const key = requireEnv("SCRAPER_SECRET_KEY");

  const url = `${base}/ingest-jobs`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-scraper-key": key },
    body: JSON.stringify({ jobs })
  });

  if (!res.ok) throw new Error(`ingest-jobs failed: ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}

export async function ingestCompanies(companies) {
  const base = functionsBaseUrl();
  const key = requireEnv("SCRAPER_SECRET_KEY");

  const url = `${base}/ingest-companies`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-scraper-key": key },
    body: JSON.stringify({ companies })
  });

  if (!res.ok) throw new Error(`ingest-companies failed: ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}
