// Hardened browser for visiting reference sites.
// Playwright defaults are not safe for untrusted sites: chromiumSandbox=false
// and acceptDownloads=true. This module flips both and adds a request guard.
import fs from "node:fs";
import { checkUrl, isPrivateIp, isLoopbackHost } from "./guard.mjs";
import { cleanLine } from "./sanitize.mjs";
import { userAgentToken } from "./net.mjs";

export function inContainer() {
  return fs.existsSync("/.dockerenv") || process.env.CAPTURE_IN_CONTAINER === "1";
}

const CHROMIUM_ARGS = [
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-default-apps",
  "--disable-component-update",
  "--disable-domain-reliability",
  "--no-first-run",
  "--no-default-browser-check",
  "--deny-permission-prompts",
  "--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication",
];

export async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error("Playwright is not installed for tools/. Run: cd tools && npm ci --ignore-scripts && npx playwright install chromium");
  }
}

/**
 * channel "chrome" uses your installed, auto-updating Chrome (best patch level);
 * without it, Playwright's bundled Chromium (pinned, reproducible) is used.
 */
export async function launchBrowser({ channel = process.env.CAPTURE_CHANNEL || "chrome", headless = true, unsafeNoSandbox = false } = {}) {
  if (unsafeNoSandbox && !inContainer()) {
    throw new Error("--unsafe-no-sandbox is refused outside a container. Never disable the Chromium sandbox on your own machine.");
  }
  const { chromium } = await loadPlaywright();
  const base = { headless, chromiumSandbox: !unsafeNoSandbox, args: CHROMIUM_ARGS };
  const attempts = channel && channel !== "chromium" ? [{ ...base, channel }, base] : [base];
  let lastError;
  for (const options of attempts) {
    try {
      const browser = await chromium.launch(options);
      return { browser, channel: options.channel || "chromium", sandbox: options.chromiumSandbox };
    } catch (error) {
      lastError = error;
      if (options.channel) console.error(`capture: channel "${options.channel}" did not start; trying bundled Chromium`);
    }
  }
  if (/sandbox/i.test(String(lastError))) {
    throw new Error("Chromium could not start with its sandbox. On Linux, enable unprivileged user namespaces, or run the capture inside the container described in tools/README.md.");
  }
  throw lastError;
}

async function defaultUserAgent(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    return await page.evaluate(() => navigator.userAgent);
  } finally {
    await context.close();
  }
}

/**
 * New ephemeral context (nothing is written to a profile on disk).
 * policy.origin: main-frame navigation may not leave this origin.
 * policy.allowLoopback: true only when capturing our own build on localhost.
 */
export async function hardenedContext(browser, policy) {
  const { width, height, allowLoopback = false, origin = null, reducedMotion = "no-preference" } = policy;
  const ua = policy.userAgent || `${await defaultUserAgent(browser)} ${userAgentToken()}`;
  const mobile = width < 768;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    acceptDownloads: false,
    serviceWorkers: "block",
    permissions: [],
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: true,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion,
    userAgent: ua,
    extraHTTPHeaders: { DNT: "1", "Sec-GPC": "1" },
  });
  const events = { blocked: [], privateResponses: [], popups: 0, dialogs: 0, downloads: 0 };

  await context.addInitScript(() => {
    // Defence in depth: no popups, no print dialogs, no permission prompts.
    try { window.open = () => null; } catch { /* ignore */ }
    try { window.print = () => {}; } catch { /* ignore */ }
    try { if (window.Notification) window.Notification.requestPermission = async () => "denied"; } catch { /* ignore */ }
  });

  await context.route("**/*", (route) => {
    const request = route.request();
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    const verdict = checkUrl(url, { allowLoopback });
    if (!verdict.ok) {
      events.blocked.push({ url: cleanLine(url, 200), reason: verdict.reason, type: request.resourceType() });
      return route.abort("blockedbyclient");
    }
    const frame = request.frame();
    if (origin && request.isNavigationRequest() && frame && !frame.parentFrame() && new URL(url).origin !== origin) {
      events.blocked.push({ url: cleanLine(url, 200), reason: "main-frame navigation away from the reference origin", type: "document" });
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });

  if (typeof context.routeWebSocket === "function") {
    try {
      await context.routeWebSocket(/.*/, (ws) => {
        events.blocked.push({ url: cleanLine(ws.url(), 200), reason: "websocket (not needed for layout capture)", type: "websocket" });
        try { ws.close(); } catch { /* ignore */ }
      });
    } catch { /* older Playwright: route guard still applies to HTTP */ }
  }

  // Route handlers do not see redirect hops, so also check where each response came from.
  context.on("response", async (response) => {
    try {
      const addr = await response.serverAddr();
      if (!addr || !isPrivateIp(addr.ipAddress)) return;
      if (allowLoopback && isLoopbackHost(addr.ipAddress)) return;
      events.privateResponses.push({ url: cleanLine(response.url(), 200), ip: addr.ipAddress });
    } catch { /* response may be gone */ }
  });

  context.on("page", (page) => {
    page.on("popup", (popup) => { events.popups++; popup.close().catch(() => {}); });
    page.on("dialog", (dialog) => { events.dialogs++; dialog.dismiss().catch(() => {}); });
    page.on("download", (download) => { events.downloads++; download.cancel().catch(() => {}); });
  });

  return { context, events, userAgent: ua };
}

/** Text that bot-protection interstitials show. We stop; we never bypass. */
export async function looksLikeBotWall(page) {
  try {
    const { title, text } = await page.evaluate(() => ({ title: document.title || "", text: (document.body && document.body.innerText || "").slice(0, 3000) }));
    const wall = /just a moment|checking your browser|attention required|verify you are human|are you a robot|cf-chl|captcha|access denied|request blocked|ddos protection/i;
    return wall.test(title) || (text.trim().length < 1500 && wall.test(text));
  } catch {
    return false;
  }
}
