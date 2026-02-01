import fs from "node:fs";
import path from "node:path";

const MASTER_SEED_FILE = process.env.MASTER_SEED_FILE;
const SHARD_INDEX = Number(process.env.SHARD_INDEX);
const SHARD_SIZE = Number(process.env.SHARD_SIZE || 100);
const OUT_SEED_FILE = process.env.OUT_SEED_FILE || "seeds/_runtime_shard.json";

if (!MASTER_SEED_FILE) {
  console.error("❌ MASTER_SEED_FILE is required");
  process.exit(1);
}
if (!Number.isInteger(SHARD_INDEX) || SHARD_INDEX < 0) {
  console.error("❌ SHARD_INDEX must be a non-negative integer");
  process.exit(1);
}
if (!Number.isInteger(SHARD_SIZE) || SHARD_SIZE <= 0) {
  console.error("❌ SHARD_SIZE must be a positive integer");
  process.exit(1);
}

const masterPath = path.resolve(process.cwd(), MASTER_SEED_FILE);
if (!fs.existsSync(masterPath)) {
  console.error(`❌ Master seed not found: ${masterPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(masterPath, "utf8");
let list;
try {
  list = JSON.parse(raw);
} catch {
  console.error("❌ MASTER_SEED_FILE is not valid JSON");
  process.exit(1);
}

if (!Array.isArray(list)) {
  console.error("❌ MASTER_SEED_FILE must be a JSON array");
  process.exit(1);
}

const totalCompanies = list.length;
const totalShards = Math.ceil(totalCompanies / SHARD_SIZE);

if (SHARD_INDEX >= totalShards) {
  console.error(
    `❌ SHARD_INDEX ${SHARD_INDEX} out of range. totalShards=${totalShards} (companies=${totalCompanies}, shardSize=${SHARD_SIZE})`
  );
  process.exit(1);
}

const start = SHARD_INDEX * SHARD_SIZE;
const end = Math.min(start + SHARD_SIZE, totalCompanies);
const shard = list.slice(start, end);

fs.mkdirSync(path.dirname(path.resolve(process.cwd(), OUT_SEED_FILE)), { recursive: true });
fs.writeFileSync(path.resolve(process.cwd(), OUT_SEED_FILE), JSON.stringify(shard, null, 2), "utf8");

console.log("✅ Master seed:", MASTER_SEED_FILE);
console.log("✅ Companies:", totalCompanies);
console.log("✅ Shard size:", SHARD_SIZE);
console.log("✅ Total shards:", totalShards);
console.log("✅ Shard index:", SHARD_INDEX);
console.log("✅ Shard range:", start, "-", end - 1);
console.log("✅ Shard companies:", shard.length);
console.log(`SHARD_OUT=${OUT_SEED_FILE}`);
