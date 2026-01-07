import { greenhouse } from "./greenhouse.js";
import { lever } from "./lever.js";

export async function routeCompany(company) {
  switch (company.ats) {
    case "greenhouse":
      return await greenhouse(company);

    case "lever":
      return await lever(company);

    default:
      return [];
  }
}
