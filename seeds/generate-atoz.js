import fs from "fs";

const inputPath = "./seeds/greenhouse-us-master.json";
const outputPath = "./seeds/greenhouse-atoz.json";

const normalize = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

const names = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

const companies = names
  .sort()
  .map((name) => ({
    name,
    ats: "greenhouse",
    greenhouse_company: normalize(name)
  }));

fs.writeFileSync(outputPath, JSON.stringify(companies, null, 2));

console.log(`✅ Generated ${companies.length} Greenhouse companies`);
