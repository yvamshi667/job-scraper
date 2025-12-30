export function detectPageType(url) {
  if (url.includes("greenhouse.io")) return "GREENHOUSE";
  if (url.includes("lever.co")) return "LEVER";
  if (url.includes("ashbyhq.com")) return "ASHBY";
  return "CUSTOM_PUBLIC";
}
