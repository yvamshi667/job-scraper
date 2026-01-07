import fs from "fs";

const input = JSON.parse(
  fs.readFileSync("seeds/greenhouse-atoz.json", "utf-8")
);

const BATCH_SIZE = 400;
let batch = [];
let batchIndex = 1;

for (let i = 0; i < input.length; i++) {
  batch.push(input[i]);

  if (batch.length === BATCH_SIZE || i === input.length - 1) {
    const name = `seeds/greenhouse-batch-${String(batchIndex).padStart(3, "0")}.json`;
    fs.writeFileSync(name, JSON.stringify(batch, null, 2));
    batch = [];
    batchIndex++;
  }
}

console.log(`✅ Created ${batchIndex - 1} batches`);
