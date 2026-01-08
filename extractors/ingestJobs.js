import { ingestJobs as ingest } from "../supabase.js";

export default async function ingestJobs(jobs) {
  return ingest(jobs);
}
