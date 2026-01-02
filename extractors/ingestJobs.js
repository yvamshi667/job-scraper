import crypto from "crypto";
import { supabase } from "../supabase.js";

const BATCH_SIZE = 100;

export async function ingestJobs(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return;
  }

  // 🔐 STEP 1: Deduplicate jobs by fingerprint BEFORE batching
  const seenFingerprints = new Set();
  const preparedJobs = [];

  for (const job of jobs) {
    if (!job.title || !job.company) continue;

    const fingerprint = `${job.title}|${job.company}|${job.url || ""}`
      .toLowerCase()
      .substring(0, 120);

    if (seenFingerprints.has(fingerprint)) {
      continue; // 🚫 prevent same fingerprint in same batch
    }

    seenFingerprints.add(fingerprint);

    preparedJobs.push({
      title: job.title,
      company: job.company,
      location: job.location || null,
      description: job.description || null,
      url: job.url || null,
      country: job.country || "US",
      employment_type: job.employment_type || null,
      experience_level: job.experience_level || null,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      currency: job.currency || "USD",
      remote_allowed: job.remote_allowed ?? false,
      visa_sponsor: job.visa_sponsor ?? false,
      ats_source: job.ats_source || "github-scraper",
      posted_at: job.posted_at || new Date().toISOString(),
      external_id: crypto.randomUUID(),
      is_active: true,
      is_direct: true,
      last_seen_at: new Date().toISOString(),
      fingerprint, // ✅ UNIQUE KEY
    });
  }

  const removed = jobs.length - preparedJobs.length;
  if (removed > 0) {
    console.log(`🧹 Removed ${removed} duplicate jobs before ingest`);
  }

  // 🔁 STEP 2: Batch upsert (safe now)
  for (let i = 0; i < preparedJobs.length; i += BATCH_SIZE) {
    const batch = preparedJobs.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("jobs")
      .upsert(batch, {
        onConflict: "fingerprint",
        ignoreDuplicates: false, // UPDATE existing rows
      });

    if (error) {
      console.error("❌ Job ingest failed:", error.message);
    }
  }
}
