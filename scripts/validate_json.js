/**
 * Validate JSON file quickly (ESM)
 * Usage: node scripts/validate_json.js <path>
 */

import fs from "node:fs";

const p = process.argv[2];
if (!p) {
  console.error("❌ Missing file path argument");
  process.exit(1);
}

try {
  const raw = fs.readFileSync(p, "utf8");
  JSON.parse(raw);
  console.log("✅ JSON valid:", p);
} catch (e) {
  console.error("❌ JSON invalid:", p);
  console.error(e?.message || e);
  process.exit(1);
}
