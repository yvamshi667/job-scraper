export function detectPageType(url) {
  if (url.includes("greenhouse.io")) return "GREENHOUSE";
  if (url.includes("lever.co")) return "LEVER";
  return "CUSTOM_PUBLIC";
}
