import { JSDOM } from "jsdom";

export async function detectCareersPage(domain) {
  try {
    const res = await fetch(domain, { redirect: "follow" });
    if (!res.ok) return null;

    const html = await res.text();
    const dom = new JSDOM(html);
    const links = [...dom.window.document.querySelectorAll("a")];

    const careersLink = links.find(a =>
      a.href &&
      /careers|jobs|join/i.test(a.href)
    );

    if (!careersLink) return null;

    const url = careersLink.href.startsWith("http")
      ? careersLink.href
      : new URL(careersLink.href, domain).href;

    return url;
  } catch {
    return null;
  }
}
