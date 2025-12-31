export default function detectATS(careersUrl = "") {
  const url = careersUrl.toLowerCase();

  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.includes("ashbyhq.com")) return "ashby";

  return "unknown";
}
