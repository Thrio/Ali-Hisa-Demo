// Network guard for reference capture.
// Decides whether a URL or IP may be contacted. Blocks private, loopback,
// link-local, metadata and internal names so a hostile page cannot make the
// capture tools reach your laptop, router, or cloud metadata (SSRF).
import net from "node:net";
import dns from "node:dns";

const V4_BLOCKS = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4], ["255.255.255.255", 32],
];

const BLOCKED_HOSTS = new Set([
  "localhost", "metadata", "metadata.google.internal", "instance-data",
  "host.docker.internal", "gateway.docker.internal", "kubernetes.default",
]);
const BLOCKED_SUFFIXES = [
  ".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet",
  ".home.arpa", ".localdomain", ".test", ".invalid",
];

function v4ToInt(ip) {
  return ip.split(".").reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0) >>> 0;
}

export function isPrivateIPv4(ip) {
  if (!net.isIPv4(ip)) return false;
  const n = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((v4ToInt(base) & mask) >>> 0);
  });
}

/** Parse an IPv6 literal into eight 16-bit groups, or null. */
export function parseIPv6(input) {
  let s = String(input).replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (!net.isIPv6(s)) return null;
  const lastColon = s.lastIndexOf(":");
  const tail = s.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (!net.isIPv4(tail)) return null;
    const n = v4ToInt(tail);
    s = s.slice(0, lastColon + 1) + ((n >>> 16) & 0xffff).toString(16) + ":" + (n & 0xffff).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (halves.length === 2 && fill < 1) return null;
  const groups = [...head, ...new Array(fill).fill("0"), ...rest];
  if (groups.length !== 8) return null;
  const nums = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return nums.some(Number.isNaN) ? null : nums;
}

function embeddedV4(hi, lo) {
  return [hi >>> 8, hi & 0xff, lo >>> 8, lo & 0xff].join(".");
}

export function isPrivateIPv6(ip) {
  const g = parseIPv6(ip);
  if (!g) return false;
  const allZeroUpTo = (k) => g.slice(0, k).every((x) => x === 0);
  if (g.every((x) => x === 0)) return true;                                   // ::
  if (allZeroUpTo(7) && g[7] === 1) return true;                              // ::1
  if (allZeroUpTo(5) && g[5] === 0xffff) return isPrivateIPv4(embeddedV4(g[6], g[7])); // ::ffff:a.b.c.d
  if (allZeroUpTo(6)) return true;                                            // ::a.b.c.d (deprecated)
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isPrivateIPv4(embeddedV4(g[6], g[7]));                             // NAT64 64:ff9b::/96
  }
  if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 1) return true;            // 64:ff9b:1::/48 local NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true;                                // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true;                                // fe80::/10 link local
  if ((g[0] & 0xffc0) === 0xfec0) return true;                                // fec0::/10 site local
  if ((g[0] & 0xff00) === 0xff00) return true;                                // ff00::/8 multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;                        // documentation
  if (g[0] === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return true;   // discard 100::/64
  if (g[0] === 0x2001 && g[1] === 0x0000) return true;                        // Teredo
  if (g[0] === 0x2002) return isPrivateIPv4(embeddedV4(g[1], g[2]));         // 6to4
  return false;
}

export function isPrivateIp(ip) {
  const s = String(ip).replace(/^\[|\]$/g, "");
  if (net.isIPv4(s)) return isPrivateIPv4(s);
  if (net.isIPv6(s.split("%")[0])) return isPrivateIPv6(s);
  return false;
}

export function isLoopbackHost(host) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "::1" || /^127\.\d+\.\d+\.\d+$/.test(h);
}

export function isBlockedHostname(host) {
  const h = String(host).toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(h)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => h.endsWith(suffix))) return true;
  return !h.includes("."); // single-label names resolve through local search domains
}

/**
 * Check a URL before any request.
 * allowLoopback: only for capturing OUR build on localhost. Never the LAN.
 */
export function checkUrl(raw, { allowLoopback = false, allowedPorts = [80, 443] } = {}) {
  let url;
  try { url = new URL(raw); } catch { return { ok: false, reason: "not a valid URL" }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: `scheme ${url.protocol} is not allowed` };
  }
  if (url.username || url.password) return { ok: false, reason: "credentials inside the URL" };
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isLoopbackHost(host)) {
    return allowLoopback ? { ok: true, url, loopback: true } : { ok: false, reason: `loopback host ${host}` };
  }
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!allowedPorts.includes(port)) return { ok: false, reason: `port ${port} is not allowed` };
  if (net.isIP(host)) {
    return isPrivateIp(host) ? { ok: false, reason: `private address ${host}` } : { ok: true, url };
  }
  if (isBlockedHostname(host)) return { ok: false, reason: `internal hostname ${host}` };
  return { ok: true, url };
}

/** Resolve a hostname and fail if ANY address is private. */
export async function assertPublicHost(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error(`blocked: ${hostname} is a private address`);
    return [{ address: hostname, family: net.isIP(hostname) }];
  }
  const list = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  const bad = list.find((entry) => isPrivateIp(entry.address));
  if (bad) throw new Error(`blocked: ${hostname} resolves to private address ${bad.address}`);
  return list;
}

/**
 * dns.lookup replacement for http/https requests. It runs at connect time,
 * so a DNS answer that changes between check and connect (rebinding) is still blocked.
 */
export function guardedLookup(hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  const opts = options || {};
  dns.lookup(hostname, { all: true, verbatim: true, family: opts.family || 0 }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: opts.family || 4 }];
    const bad = list.find((entry) => isPrivateIp(entry.address));
    if (bad) {
      const error = new Error(`blocked: ${hostname} resolves to private address ${bad.address}`);
      error.code = "EBLOCKEDPRIVATE";
      return callback(error);
    }
    if (opts.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}
