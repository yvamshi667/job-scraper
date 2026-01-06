import fs from "fs";

const companies = [
  { name: "Stripe", domain: "https://stripe.com", greenhouse_company: "stripe" },
  { name: "Airbnb", domain: "https://airbnb.com", greenhouse_company: "airbnb" },
  { name: "Notion", domain: "https://notion.so" },
  { name: "Rippling", domain: "https://rippling.com", greenhouse_company: "rippling" },
  { name: "Coinbase", domain: "https://coinbase.com", greenhouse_company: "coinbase" }
];

async function discover() {
  console.log("🚀 Discovering companies...");

  const discovered = companies.map(c => {
    if (c.greenhouse_company) {
      return {
        name: c.name,
        domain: c.domain,
        ats: "greenhouse",
        greenhouse_company: c.greenhouse_company
      };
    }

    return {
      name: c.name,
      domain: c.domain,
      ats: "generic"
    };
  });

  fs.writeFileSync("companies.json", JSON.stringify(discovered, null, 2));
  console.log(`✅ Saved ${discovered.length} companies to companies.json`);
}

discover();
