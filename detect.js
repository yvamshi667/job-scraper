export default function detectATS(url) {
  if (!url) return null;

  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("ashbyhq.com")) return "ashby";

  return null;
}
