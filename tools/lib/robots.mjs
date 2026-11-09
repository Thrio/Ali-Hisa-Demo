// robots.txt parsing and matching, following RFC 9309:
// most specific user-agent group wins; longest matching rule wins;
// on a tie, Allow wins; "*" matches any run of characters; "$" anchors the end.

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") { sitemaps.push(value); continue; }
    if (!current) continue;
    if (key === "allow" || key === "disallow") current.rules.push({ allow: key === "allow", path: value });
    else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = Math.min(n, 60);
    }
  }
  return { groups, sitemaps };
}

function toRegex(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") re += ".*";
    else if (ch === "$" && i === pattern.length - 1) re += "$";
    else re += ch.replace(/[.+?^{}()|[\]\\$]/g, "\\$&");
  }
  return new RegExp("^" + re);
}

/** Pick the rules that apply to this user agent (merged when several groups name it). */
export function rulesFor(robots, userAgent) {
  const token = String(userAgent || "").toLowerCase();
  let best = null;
  for (const group of robots.groups) {
    for (const agent of group.agents) {
      if (agent !== "*" && token.includes(agent) && (!best || agent.length > best.length)) best = agent;
    }
  }
  const chosen = best || "*";
  const groups = robots.groups.filter((g) => g.agents.includes(chosen));
  return {
    agent: chosen,
    rules: groups.flatMap((g) => g.rules),
    crawlDelay: groups.map((g) => g.crawlDelay).find((d) => d != null) ?? null,
    matched: groups.length > 0,
  };
}

export function isAllowed(robots, userAgent, pathWithQuery) {
  const { rules, crawlDelay, agent } = rulesFor(robots, userAgent);
  let match = null;
  for (const rule of rules) {
    if (rule.path === "") continue; // "Disallow:" with no value allows everything
    if (!toRegex(rule.path).test(pathWithQuery)) continue;
    const len = rule.path.length;
    if (!match || len > match.len || (len === match.len && rule.allow && !match.allow)) match = { ...rule, len };
  }
  return { allowed: !match || match.allow, rule: match ? `${match.allow ? "Allow" : "Disallow"}: ${match.path}` : null, crawlDelay, agent };
}
