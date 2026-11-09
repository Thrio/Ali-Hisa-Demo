// Functions that run INSIDE the reference page via page.evaluate().
// Each one is self-contained (no outer variables) and never throws to the caller.
// Everything they return is untrusted; Node cleans it again before writing.

/** Hide consent banners (and, when asked, full-screen preloaders). Never clicks "Accept". */
export function pageHideOverlays(args) {
  const vw = innerWidth; const vh = innerHeight; const hidden = [];
  const clsOf = (el) => String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").slice(0, 60);
  const hide = (el, why) => {
    if (!el || el.getAttribute("data-wp-hidden")) return;
    el.setAttribute("data-wp-hidden", why);
    el.style.setProperty("display", "none", "important");
    hidden.push({ why, tag: el.tagName.toLowerCase(), cls: clsOf(el) });
  };
  const KNOWN = "#onetrust-banner-sdk,#onetrust-consent-sdk,#CybotCookiebotDialog,#usercentrics-root,.cky-consent-container,.cc-window,#cookie-law-info-bar,.cookie-notice,#truste-consent-track,.osano-cm-window,#didomi-host,.qc-cmp2-container,#cookiescript_injected,.cmplz-cookiebanner,#moove_gdpr_cookie_info_bar";
  try { document.querySelectorAll(KNOWN).forEach((el) => hide(el, "consent banner (known id)")); } catch (e) { /* ignore */ }
  const textRe = /cookie|consent|gdpr|privacy preferences|we use cookies|accept all|reject all|manage preferences|kuki|biskota/i;
  for (const el of [...document.body.querySelectorAll("div,section,aside,dialog,form")].slice(0, 4000)) {
    const cs = getComputedStyle(el);
    if ((cs.position !== "fixed" && cs.position !== "sticky") || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.top <= 4 && r.height <= 200 && el.querySelector("nav, a[href='/']")) continue; // looks like the site header
    const area = r.width * r.height;
    const text = (el.innerText || "").slice(0, 1600);
    if (textRe.test(text) && text.length < 1500 && area < vw * vh * 0.85) hide(el, "consent banner (text)");
    else if (args && args.preloaders && area >= vw * vh * 0.9 && text.trim().length < 40 && Number(cs.zIndex) >= 10 && Number(cs.opacity) >= 0.5) hide(el, "full-screen preloader or curtain");
  }
  if (hidden.length) {
    for (const el of [document.documentElement, document.body]) {
      if (el && getComputedStyle(el).overflow === "hidden") el.style.setProperty("overflow", "auto", "important");
    }
  }
  return hidden;
}

/** Find page bands (sections), the header and the footer; mark them with data-wp-* attributes. */
export function pageFindBands(args) {
  const minHeight = (args && args.minHeight) || 120;
  const maxBands = (args && args.maxBands) || 24;
  const vw = document.documentElement.clientWidth || innerWidth;
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META|IFRAME)$/;
  const vis = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isChrome = (el) => /^(HEADER|FOOTER|NAV)$/.test(el.tagName) || ["banner", "contentinfo", "navigation"].includes(el.getAttribute("role") || "");
  const pos = (el) => getComputedStyle(el).position;
  const scroller = document.querySelector('[data-wp-scroller="1"]');
  const offY = () => (scroller ? scroller.scrollTop - scroller.getBoundingClientRect().top : scrollY);
  const rect = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + offY()), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }; };
  const clsOf = (el) => String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").split(/\s+/).filter(Boolean).slice(0, 3).join(" ").slice(0, 80);

  let header = [...document.querySelectorAll("header,[role=banner]")].filter(vis).find((el) => rect(el).top < 200) || null;
  if (!header) {
    header = [...document.body.querySelectorAll("*")].slice(0, 500).find((el) => {
      const p = pos(el); if (p !== "fixed" && p !== "sticky") return false;
      const r = el.getBoundingClientRect();
      return r.top <= 2 && r.width >= vw * 0.9 && r.height >= 30 && r.height <= 260;
    }) || null;
  }
  const footers = [...document.querySelectorAll("footer,[role=contentinfo]")].filter(vis);
  const footer = footers.length ? footers[footers.length - 1] : null;
  if (header) header.setAttribute("data-wp-part", "header");
  if (footer) footer.setAttribute("data-wp-part", "footer");

  const SKIPTAG = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META|IFRAME)$/;
  const kidsOf = (r) => [...r.children].filter((k) => !SKIPTAG.test(k.tagName) && vis(k) && k !== header && k !== footer && !isChrome(k));
  const collect = (r) => kidsOf(r).filter((k) => {
    if (header && k.contains(header)) return false;
    if (footer && k.contains(footer)) return false;
    if (pos(k) === "fixed") return false;
    const b = k.getBoundingClientRect();
    return b.height >= minHeight && b.width >= vw * 0.6;
  });
  let mode = "auto";
  let bands = [];
  if (args && Array.isArray(args.selectors) && args.selectors.length) {
    mode = "selectors";
    for (const s of args.selectors) { try { const el = document.querySelector(s); if (el && vis(el)) bands.push(el); } catch (e) { /* bad selector */ } }
  } else {
    const marked = [...document.querySelectorAll("[data-band]")].filter(vis);
    if (marked.length) { mode = "data-band"; bands = marked; }
  }
  if (!bands.length) {
    mode = "auto";
    const main = [...document.querySelectorAll("main,[role=main]")].find((el) => vis(el) && el.getBoundingClientRect().height > 300);
    let root = main || document.body;
    for (let i = 0; i < 8; i++) {
      const big = kidsOf(root).filter((k) => k.getBoundingClientRect().height >= minHeight);
      if (big.length === 1 && big[0].getBoundingClientRect().height >= root.getBoundingClientRect().height * 0.6) { root = big[0]; continue; }
      break;
    }
    bands = collect(root);
    for (let guard = 0; bands.length === 1 && guard < 3; guard++) {
      const inner = collect(bands[0]);
      if (inner.length >= 2) bands = inner; else break;
    }
  }
  if (mode === "auto") {
    // Split oversized wrappers (one div holding every section) into their sections, but keep
    // pinned sequences whole: a container with a sticky or fixed child is one scroll story.
    const pinned = (el) => [...el.children].some((k) => /sticky|fixed/.test(getComputedStyle(k).position));
    for (let round = 0; round < 3; round++) {
      let changed = false;
      const next = [];
      for (const b of bands) {
        const kids = b.getBoundingClientRect().height > innerHeight * 2.5 && !pinned(b) ? collect(b) : [];
        if (kids.length >= 2) { next.push(...kids); changed = true; } else next.push(b);
      }
      bands = next;
      if (!changed) break;
    }
  }
  // Document order, not on-screen position: smooth-scroll libraries and sticky heroes make
  // positions depend on where the page happens to be scrolled. Listed selectors keep their order.
  if (mode !== "selectors") bands = bands.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  bands = bands.slice(0, maxBands);
  const used = new Set();
  const out = bands.map((el, i) => {
    let label = String(i + 1);
    if (mode === "data-band") label = String(el.getAttribute("data-band") || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || label;
    if (used.has(label)) label = `${label}-${i + 1}`;
    used.add(label);
    el.setAttribute("data-wp-band", label);
    return { label, index: i + 1, tag: el.tagName.toLowerCase(), id: String(el.id || "").slice(0, 60), cls: clsOf(el), rect: rect(el), position: pos(el) };
  });
  const docHeight = scroller ? scroller.scrollHeight : Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  return {
    mode,
    bands: out,
    header: header ? { rect: rect(header), position: pos(header), tag: header.tagName.toLowerCase() } : null,
    footer: footer ? { rect: rect(footer), tag: footer.tagName.toLowerCase() } : null,
    viewport: { width: vw, height: innerHeight },
    docHeight,
  };
}

/** Computed-style walk of one band (website-plan peer-extract, scripted) plus a summary for measures/*.md. */
export function pageMeasureTree(args) {
  const { selector, depth = 3, maxChildren = 12 } = args;
  const el = document.querySelector(selector);
  if (!el) return { error: "not found: " + selector };
  const props = ["fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing", "textTransform", "textAlign",
    "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginRight", "marginBottom", "marginLeft",
    "width", "height", "maxWidth", "minHeight", "maxHeight", "boxSizing", "display", "flexDirection", "flexWrap", "justifyContent",
    "alignItems", "gap", "rowGap", "columnGap", "gridTemplateColumns", "gridTemplateRows", "aspectRatio", "overflow",
    "borderRadius", "boxShadow", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle",
    "borderTopColor", "position", "top", "bottom", "left", "right", "zIndex", "objectFit", "objectPosition", "opacity", "transform"];
  const SKIPV = new Set(["none", "normal", "auto", "0px", "rgba(0, 0, 0, 0)", "0px 0px 0px 0px"]);
  const clsOf = (e) => String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || "").split(/\s+/).filter(Boolean).slice(0, 4).join(" ").slice(0, 100);
  const directText = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  const paint = (cs) => {
    const img = cs.backgroundImage && cs.backgroundImage !== "none";
    const transparent = !cs.backgroundColor || cs.backgroundColor === "transparent" || cs.backgroundColor === "rgba(0, 0, 0, 0)";
    return img ? "image" : transparent ? "transparent" : "opaque";
  };
  const lines = (e, cs) => { const lh = parseFloat(cs.lineHeight); const h = e.getBoundingClientRect().height; return Number.isFinite(lh) && lh > 0 ? Math.max(1, Math.round(h / lh)) : null; };
  function node(e, d) {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    const styles = {};
    for (const p of props) { const v = cs[p]; if (v && !SKIPV.has(v)) styles[p] = String(v).slice(0, 160); }
    if (styles.fontFamily) styles.fontFamily = styles.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const t = directText(e);
    const rec = {
      tag: e.tagName.toLowerCase(), cls: clsOf(e),
      box: { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) },
      styles, backgroundPaint: paint(cs),
      text: t ? { chars: t.length, lines: lines(e, cs) } : null,
      img: e.tagName === "IMG" ? { natural: [e.naturalWidth, e.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)] } : null,
      childCount: e.children.length,
    };
    if (d < depth) rec.children = [...e.children].filter((k) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(k.tagName)).slice(0, maxChildren).map((k) => node(k, d + 1));
    return rec;
  }
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  const typeOf = (e) => { if (!e) return null; const c = getComputedStyle(e); const tt = (e.innerText || "").replace(/\s+/g, " ").trim(); return { tag: e.tagName.toLowerCase(), family: c.fontFamily.split(",")[0].replace(/["']/g, "").trim(), size: c.fontSize, weight: c.fontWeight, lineHeight: c.lineHeight, letterSpacing: c.letterSpacing, transform: c.textTransform, chars: tt.length, lines: lines(e, c) }; };
  let widest = null; let widestW = -1;
  for (const e of [el, ...el.querySelectorAll("*")].slice(0, 1500)) {
    const d = getComputedStyle(e).display;
    if (!/grid|flex/.test(d)) continue;
    const kids = [...e.children].filter((k) => getComputedStyle(k).display !== "none");
    if (kids.length < 2) continue;
    const w = e.getBoundingClientRect().width;
    if (w > widestW) { widestW = w; widest = e; }
  }
  let columns = 1;
  if (widest) {
    const wc = getComputedStyle(widest);
    if (/grid/.test(wc.display)) columns = Math.max(1, wc.gridTemplateColumns.split(/\s+/).filter((c) => c && c !== "none").length);
    else { const kids = [...widest.children].filter((k) => getComputedStyle(k).display !== "none"); const top0 = kids[0].getBoundingClientRect().top; columns = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top0) < 8).length; }
  }
  const boxed = [el, ...el.querySelectorAll("*")].slice(0, 800).find((e) => { const mw = getComputedStyle(e).maxWidth; return mw && mw !== "none" && mw !== "100%"; });
  const count = (s) => el.querySelectorAll(s).length;
  const paras = [...el.querySelectorAll("p")];
  return {
    viewport: { width: innerWidth, height: innerHeight },
    placement: { top: Math.round(r.top + scrollY), viewportTop: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) },
    summary: {
      padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(" "),
      margin: [cs.marginTop, cs.marginBottom].join(" "),
      display: cs.display, flexDirection: cs.flexDirection, gap: cs.gap,
      contentBox: boxed ? { maxWidth: getComputedStyle(boxed).maxWidth, width: Math.round(boxed.getBoundingClientRect().width), paddingInline: [getComputedStyle(boxed).paddingLeft, getComputedStyle(boxed).paddingRight].join(" "), tag: boxed.tagName.toLowerCase() } : null,
      columns, layoutDriver: widest ? `${getComputedStyle(widest).display} ${getComputedStyle(widest).gridTemplateColumns !== "none" ? getComputedStyle(widest).gridTemplateColumns.slice(0, 80) : getComputedStyle(widest).flexDirection}` : "block",
      layoutGap: widest ? getComputedStyle(widest).gap : null,
      backgroundPaint: paint(cs),
      border: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].join(" "),
      radius: cs.borderRadius,
      heading: typeOf(el.querySelector("h1,h2,h3")),
      body: typeOf(paras[0] || null),
      copy: { paragraphs: paras.length, bodyChars: paras.reduce((s, p) => s + (p.innerText || "").trim().length, 0) },
      slots: { h1: count("h1"), h2: count("h2"), h3: count("h3"), p: paras.length, li: count("li"), links: count("a"), buttons: count("button"), images: count("img,picture"), video: count("video"), svg: count("svg"), inputs: count("input,textarea,select"), canvas: count("canvas") },
    },
    tree: node(el, 0),
  };
}

/** Page-level design tokens (histograms), breakpoints, libraries and platform. Observation only. */
export function pageTokens() {
  const els = [...document.body.querySelectorAll("*")].slice(0, 6000);
  const maps = {};
  const add = (name, key) => { if (!key) return; const m = maps[name] || (maps[name] = new Map()); m.set(key, (m.get(key) || 0) + 1); };
  const firstFn = (v) => { const m = String(v || "").match(/[a-z-]+(\([^)]*\))?/i); return m ? m[0] : ""; };
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === "none") continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (hasText) {
      add("fonts", cs.fontFamily.split(",")[0].replace(/["']/g, "").trim());
      add("fontSizes", cs.fontSize); add("fontWeights", cs.fontWeight); add("lineHeights", cs.lineHeight);
      add("letterSpacing", cs.letterSpacing); add("textColors", cs.color);
    }
    if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") add("backgroundColors", cs.backgroundColor);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") add("borderColors", cs.borderTopColor);
    for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "rowGap", "columnGap", "marginTop", "marginBottom"]) {
      const v = cs[p]; if (v && v !== "0px" && v !== "normal" && /px$/.test(v)) add("spacing", Math.round(parseFloat(v)) + "px");
    }
    if (cs.borderTopLeftRadius && cs.borderTopLeftRadius !== "0px") add("radii", cs.borderTopLeftRadius);
    if (cs.boxShadow && cs.boxShadow !== "none") add("shadows", cs.boxShadow.slice(0, 120));
    if (cs.transitionDuration && cs.transitionDuration !== "0s") { add("transitionDurations", cs.transitionDuration.split(",")[0].trim()); add("easings", firstFn(cs.transitionTimingFunction)); }
    if (cs.animationName && cs.animationName !== "none") add("animations", cs.animationName.split(",")[0].trim().slice(0, 50) + " " + cs.animationDuration.split(",")[0]);
  }
  let crossOriginSheets = 0;
  const walk = (rules) => {
    for (const rule of rules) {
      const text = rule.conditionText || (rule.media && rule.media.mediaText) || "";
      for (const m of String(text).matchAll(/(min|max)-width:\s*([\d.]+)(px|em|rem)/g)) add("breakpoints", `${m[1]} ${Math.round(m[3] === "px" ? Number(m[2]) : Number(m[2]) * 16)}px`);
      if (rule.cssRules) { try { walk(rule.cssRules); } catch (e) { /* ignore */ } }
    }
  };
  for (const sheet of [...document.styleSheets]) { try { walk(sheet.cssRules); } catch (e) { crossOriginSheets++; } }
  const top = (name, n) => [...((maps[name] || new Map()).entries())].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value: String(value).slice(0, 140), count }));
  const q = (s) => { try { return Boolean(document.querySelector(s)); } catch (e) { return false; } };
  const w = window;
  return {
    fonts: top("fonts", 8), fontSizes: top("fontSizes", 16), fontWeights: top("fontWeights", 8), lineHeights: top("lineHeights", 12),
    letterSpacing: top("letterSpacing", 8), textColors: top("textColors", 10), backgroundColors: top("backgroundColors", 10),
    borderColors: top("borderColors", 8), spacing: top("spacing", 20), radii: top("radii", 10), shadows: top("shadows", 6),
    transitionDurations: top("transitionDurations", 8), easings: top("easings", 8), animations: top("animations", 10),
    breakpoints: top("breakpoints", 12), crossOriginSheets,
    libraries: {
      gsap: w.gsap ? String(w.gsap.version || "yes").slice(0, 20) : false, scrollTrigger: Boolean(w.ScrollTrigger),
      lenis: Boolean(w.Lenis || w.lenis) || q("html.lenis,.lenis"), locomotive: q("[data-scroll-container],.has-scroll-smooth"),
      swiper: Boolean(w.Swiper) || q(".swiper,.swiper-container"), splide: q(".splide"), embla: q(".embla,[data-embla]"),
      slick: q(".slick-slider"), aos: q("[data-aos]"), framerMotion: q("[data-framer-appear-id],[data-framer-name]"),
      three: Boolean(w.THREE), lottie: Boolean(w.lottie || w.bodymovin) || q("lottie-player,dotlottie-player"),
      canvas: document.querySelectorAll("canvas").length, webAnimations: document.getAnimations ? document.getAnimations().length : 0,
    },
    platform: {
      nextjs: q("#__next") || Boolean(w.__NEXT_DATA__) || q("script[src*='/_next/']"), nuxt: Boolean(w.__NUXT__), astro: q("astro-island"),
      webflow: q("html[data-wf-site]"), framer: q("#__framer-badge-container,[data-framer-hydrate-v2]"),
      wordpress: q("link[href*='/wp-content/'],script[src*='/wp-content/']"), shopify: Boolean(w.Shopify),
      wix: q("meta[name=generator][content*=Wix]"), squarespace: q("meta[name=generator][content*=Squarespace]"),
      generator: String((document.querySelector("meta[name=generator]") || {}).content || "").slice(0, 80),
    },
    elements: els.length,
  };
}

/** Image / background / video inventory for one band. Nothing is downloaded. */
export function pageAssets(args) {
  const root = (args && args.selector && document.querySelector(args.selector)) || document.body;
  const clsOf = (e) => String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || "");
  const logoish = (e, src, alt) => {
    const inChrome = Boolean(e.closest("header,footer,nav,[role=banner],[role=contentinfo]"));
    const s = `${src} ${alt} ${clsOf(e)} ${e.id}`.toLowerCase();
    const r = e.getBoundingClientRect();
    return /logo|wordmark|brandmark|brand-mark|favicon|apple-touch/.test(s) || (inChrome && r.height < 120 && r.width < 360);
  };
  const images = [...root.querySelectorAll("img")].slice(0, 80).map((img) => {
    const r = img.getBoundingClientRect(); const cs = getComputedStyle(img); const src = img.currentSrc || img.src || "";
    return { src: src.slice(0, 400), alt: String(img.alt || "").slice(0, 200), natural: [img.naturalWidth, img.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)],
      aspect: r.height ? Math.round((r.width / r.height) * 100) / 100 : null, objectFit: cs.objectFit, position: cs.position, zIndex: cs.zIndex,
      logoSuspect: logoish(img, src, img.alt || ""), inPicture: Boolean(img.closest("picture")) };
  });
  const backgrounds = [];
  for (const e of [root, ...root.querySelectorAll("*")].slice(0, 3000)) {
    const cs = getComputedStyle(e); const bi = cs.backgroundImage;
    if (!bi || bi === "none") continue;
    const urls = [...bi.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1].slice(0, 400)).slice(0, 3);
    const r = e.getBoundingClientRect();
    backgrounds.push({ urls, gradient: /gradient\(/.test(bi), size: cs.backgroundSize, position: cs.backgroundPosition, box: [Math.round(r.width), Math.round(r.height)], tag: e.tagName.toLowerCase(), logoSuspect: urls.some((u) => /logo|wordmark|brandmark/i.test(u)) });
    if (backgrounds.length >= 40) break;
  }
  const videos = [...root.querySelectorAll("video")].slice(0, 20).map((v) => {
    const r = v.getBoundingClientRect(); const source = v.querySelector("source");
    return { src: String(v.currentSrc || v.src || (source && source.src) || "").slice(0, 400), poster: String(v.poster || "").slice(0, 400), autoplay: v.autoplay, muted: v.muted, loop: v.loop, rendered: [Math.round(r.width), Math.round(r.height)] };
  });
  const svgs = [...root.querySelectorAll("svg")];
  const iframeHosts = [...root.querySelectorAll("iframe")].slice(0, 10).map((f) => { try { return new URL(f.src, location.href).hostname; } catch (e) { return ""; } });
  return { images, backgrounds, videos, svgInline: svgs.length, svgLarge: svgs.filter((s) => s.getBoundingClientRect().width > 200).length,
    canvas: root.querySelectorAll("canvas").length, iframeHosts,
    layers: images.filter((i) => !i.logoSuspect).length + backgrounds.filter((b) => b.urls.length).length + videos.length };
}

/** Text a human cannot see but an AI reading the page would: the classic prompt-injection hiding places. */
export function pageHiddenText() {
  const vw = innerWidth; const hidden = []; let hiddenTotal = 0;
  const reasonFor = (el) => {
    try { if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return "not rendered (display, visibility or opacity)"; } catch (e) { /* ignore */ }
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (parseFloat(cs.fontSize) < 3) return "font-size under 3px";
    if (r.right < -100 || r.left > vw * 3 || r.bottom < -3000) return "positioned off-screen";
    if (r.width <= 1 && r.height <= 1) return "1px box (visually hidden)";
    if (/inset\(\s*(50|100)%|rect\(\s*0/.test(`${cs.clipPath} ${cs.clip}`)) return "clipped away";
    let p = el; let bg = null;
    for (let i = 0; i < 12 && p; i++) { const b = getComputedStyle(p).backgroundColor; if (b && b !== "rgba(0, 0, 0, 0)" && b !== "transparent") { bg = b; break; } p = p.parentElement; }
    if (bg && bg === cs.color) return "text colour equals background";
    return null;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; let seen = 0;
  while ((n = walker.nextNode()) && seen < 30000) {
    seen++;
    const t = n.textContent.replace(/\s+/g, " ").trim();
    if (t.length < 25) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const reason = reasonFor(el);
    if (!reason) continue;
    hiddenTotal++;
    if (hidden.length < 200) hidden.push({ reason, tag: el.tagName.toLowerCase(), text: t.slice(0, 500) });
  }
  const comments = [];
  const cw = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_COMMENT);
  while ((n = cw.nextNode()) && comments.length < 80) { const t = n.textContent.replace(/\s+/g, " ").trim(); if (t.length >= 20) comments.push(t.slice(0, 500)); }
  const attributes = [];
  for (const el of [...document.querySelectorAll("[alt],[title],[aria-label],[aria-description],[data-ai],[data-prompt]")].slice(0, 600)) {
    for (const a of ["alt", "title", "aria-label", "aria-description", "data-ai", "data-prompt"]) {
      const v = el.getAttribute(a); if (v && v.length >= 25 && attributes.length < 200) attributes.push({ attr: a, tag: el.tagName.toLowerCase(), text: v.slice(0, 400) });
    }
  }
  const metas = [...document.querySelectorAll("meta[content]")].slice(0, 60)
    .map((m) => ({ name: String(m.getAttribute("name") || m.getAttribute("property") || "").slice(0, 60), text: String(m.getAttribute("content") || "").slice(0, 400) }))
    .filter((m) => m.text.length >= 25);
  return { hidden, hiddenTotal, comments, attributes, metas };
}

export function pageVisibleText() {
  return { title: String(document.title || "").slice(0, 200), lang: String(document.documentElement.lang || "").slice(0, 20), text: String((document.body && document.body.innerText) || "").slice(0, 300000) };
}

/** Same-origin links with where they sit (nav / footer / main). */
export function pageLinks() {
  const out = []; const seen = new Set();
  for (const a of [...document.querySelectorAll("a[href]")].slice(0, 1500)) {
    let u; try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { continue; }
    if (u.origin !== location.origin) continue;
    const key = u.pathname.replace(/\/+$/, "") || "/";
    if (seen.has(key)) continue; seen.add(key);
    const zone = a.closest("header,nav,[role=banner],[role=navigation]") ? "nav" : a.closest("footer,[role=contentinfo]") ? "footer" : "main";
    out.push({ path: key.slice(0, 200), text: String(a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 80), zone });
  }
  return out;
}

/** Motion state of every band and up to N key children each (marked once, so every step reads the same nodes). */
export function pageMotionSweep(args) {
  const max = args.maxChildren || 8;
  const eff = (el, stop) => { let o = 1; for (let n = el, i = 0; n && i < 12; n = n.parentElement, i++) { o *= Number(getComputedStyle(n).opacity); if (n === stop) break; } return Math.round(o * 1000) / 1000; };
  const pick = (el, band) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), h: Math.round(r.height), opacity: Number(cs.opacity), eff: eff(el, band), transform: cs.transform, clip: cs.clipPath, visibility: cs.visibility }; };
  const out = { scrollY: Math.round(scrollY), bands: {} };
  for (const label of args.labels || []) {
    const band = document.querySelector(`[data-wp-band="${label}"]`);
    if (!band) continue;
    let keys = band.querySelectorAll("[data-wp-key]");
    if (!keys.length) {
      [...band.querySelectorAll("h1,h2,h3,p,img,picture,video,a,button,li,figure,[class*=card],[class*=item]")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 10; })
        .slice(0, max)
        .forEach((el, i) => el.setAttribute("data-wp-key", String(i)));
      keys = band.querySelectorAll("[data-wp-key]");
    }
    out.bands[label] = { band: pick(band, band), kids: [...keys].slice(0, max).map((k) => pick(k, band)) };
  }
  return out;
}

export function pageHeaderState() {
  const h = document.querySelector('[data-wp-part="header"]');
  if (!h) return null;
  const cs = getComputedStyle(h); const r = h.getBoundingClientRect();
  return { top: Math.round(r.top), height: Math.round(r.height), position: cs.position, background: cs.backgroundColor, backdrop: cs.backdropFilter || cs.webkitBackdropFilter || "", shadow: cs.boxShadow, transform: cs.transform, opacity: Number(cs.opacity), color: cs.color, scrollY: Math.round(scrollY) };
}

/** Mark up to N styled CTAs in the header and first two bands for the hover probe. */
export function pageHoverTargets(args) {
  const max = (args && args.max) || 4;
  const styled = (el) => {
    const cs = getComputedStyle(el);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const opaque = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
    return padX >= 12 && padY >= 6 && (opaque || parseFloat(cs.borderTopWidth) >= 1);
  };
  const scopes = ['[data-wp-part="header"]', '[data-wp-band="1"]', '[data-wp-band="2"]'].map((s) => document.querySelector(s)).filter(Boolean);
  const out = [];
  for (const scope of scopes) {
    for (const el of scope.querySelectorAll("a,button")) {
      if (out.length >= max) break;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 20 || !styled(el)) continue;
      const key = String(out.length);
      el.setAttribute("data-wp-hover", key);
      out.push({ key, scope: scope.getAttribute("data-wp-part") || `band-${scope.getAttribute("data-wp-band")}`, tag: el.tagName.toLowerCase() });
    }
  }
  return out;
}

export function pageStyleOf(args) {
  const el = document.querySelector(args.selector);
  if (!el) return null;
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  const out = {};
  for (const p of ["backgroundColor", "color", "borderTopColor", "boxShadow", "transform", "textDecorationLine", "opacity", "letterSpacing", "filter"]) out[p] = cs[p];
  out.transition = `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`.slice(0, 200);
  out.box = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  return out;
}

/** Find a mobile-menu toggle. Real links are never clicked. */
export function pageMenuToggle() {
  const scope = document.querySelector('[data-wp-part="header"]') || document.body;
  const re = /menu|nav|burger|hamburger|toggle|open|meny|meni/i;
  for (const el of scope.querySelectorAll("button,[role=button],[aria-controls],[aria-expanded],a")) {
    const r = el.getBoundingClientRect();
    if (r.width < 16 || r.height < 16 || r.width > 180) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (el.tagName === "A") { const href = el.getAttribute("href"); if (href && !href.startsWith("#")) continue; }
    const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "");
    const label = `${el.getAttribute("aria-label") || ""} ${el.textContent || ""} ${cls} ${el.id}`;
    if (re.test(label) || el.hasAttribute("aria-expanded")) {
      el.setAttribute("data-wp-menu-toggle", "1");
      return { found: true, label: label.replace(/\s+/g, " ").trim().slice(0, 80), expanded: el.getAttribute("aria-expanded") };
    }
  }
  return { found: false };
}

/** Visible fixed/absolute layers that cover 40%+ of the viewport (open menus, modals). */
export function pageLargeLayers() {
  const vw = innerWidth; const vh = innerHeight; const out = [];
  for (const el of [...document.body.querySelectorAll("*")].slice(0, 5000)) {
    const cs = getComputedStyle(el);
    if ((cs.position !== "fixed" && cs.position !== "absolute") || cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    if (area < vw * vh * 0.4) continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || "").slice(0, 80), coverPct: Math.round((100 * area) / (vw * vh)), transition: `${cs.transitionDuration} ${cs.transitionTimingFunction}`.slice(0, 120), backdrop: cs.backdropFilter || "", clipPath: cs.clipPath });
    if (out.length >= 10) break;
  }
  return out;
}

/** Carousel / marquee candidates; sampled twice to detect time-driven motion. */
export function pageCarouselSample() {
  const sel = "[class*=swiper-wrapper],[class*=slick-track],[class*=splide__list],[class*=embla__container],[class*=carousel],[class*=slider],[class*=marquee],[class*=ticker]";
  return [...document.querySelectorAll(sel)].slice(0, 12).map((el, i) => {
    if (!el.getAttribute("data-wp-carousel")) el.setAttribute("data-wp-carousel", String(i));
    const band = el.closest("[data-wp-band]");
    const first = el.firstElementChild;
    return { key: el.getAttribute("data-wp-carousel"), band: band ? band.getAttribute("data-wp-band") : null, transform: getComputedStyle(el).transform, scrollLeft: Math.round(el.scrollLeft), firstLeft: first ? Math.round(first.getBoundingClientRect().left) : null };
  });
}

/** Tabs / accordions per band: click-driven candidates (not clicked — verify by hand). */
export function pageClickCandidates() {
  const out = {};
  for (const band of document.querySelectorAll("[data-wp-band]")) {
    const n = band.querySelectorAll("[role=tab],[aria-expanded],details>summary,[data-accordion],[class*=accordion],[class*=tabs]").length;
    if (n) out[band.getAttribute("data-wp-band")] = n;
  }
  return out;
}

/** Hide the fixed header and small floating widgets for band shots; returns a restore token. */
export function pageHideFloating(args) {
  const restore = args && args.restore;
  if (restore) {
    document.querySelectorAll("[data-wp-floating]").forEach((el) => { el.style.removeProperty("visibility"); el.removeAttribute("data-wp-floating"); });
    return 0;
  }
  let n = 0; const vw = innerWidth; const vh = innerHeight;
  const header = document.querySelector('[data-wp-part="header"]');
  if (header && /fixed|sticky/.test(getComputedStyle(header).position)) { header.setAttribute("data-wp-floating", "1"); header.style.setProperty("visibility", "hidden", "important"); n++; }
  for (const el of [...document.body.querySelectorAll("*")].slice(0, 5000)) {
    if (el.closest("[data-wp-band]") || el.closest('[data-wp-part="header"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < vw * vh * 0.25 && r.width > 0) { el.setAttribute("data-wp-floating", "1"); el.style.setProperty("visibility", "hidden", "important"); n++; }
  }
  return n;
}

/** Scroll model: the document, or one nested scroll container (body locked, an inner element scrolls).
 *  Marks the container with data-wp-scroller="1" so the other helpers scroll it. */
export function pageScrollMode() {
  const de = document.documentElement;
  const docH = Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0);
  for (const old of document.querySelectorAll("[data-wp-scroller]")) old.removeAttribute("data-wp-scroller");
  if (docH > innerHeight + 50) return { mode: "document", scrollHeight: docH, clientHeight: innerHeight };
  let best = null, area = 0;
  for (const el of document.body ? document.body.querySelectorAll("*") : []) {
    const oy = getComputedStyle(el).overflowY;
    if (!/(auto|scroll|overlay)/.test(oy) || el.scrollHeight <= el.clientHeight + 50) continue;
    const r = el.getBoundingClientRect();
    const a = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    if (a > area) { area = a; best = el; }
  }
  if (!best || area < innerWidth * innerHeight * 0.6) return { mode: "document", scrollHeight: docH, clientHeight: innerHeight };
  best.setAttribute("data-wp-scroller", "1");
  const name = best.tagName.toLowerCase() + (best.id ? "#" + best.id : "") + (best.classList && best.classList[0] ? "." + best.classList[0] : "");
  return { mode: "container", selector: name.slice(0, 80), scrollHeight: best.scrollHeight, clientHeight: best.clientHeight };
}

/** Scroll the marked container (if any) or the window to y; returns the position reached. */
export function pageScrollTo(y) {
  const s = document.querySelector('[data-wp-scroller="1"]');
  if (s) { s.scrollTop = y; return s.scrollTop; }
  window.scrollTo({ top: y, behavior: "instant" });
  return scrollY;
}

/** At the end of the page: is the real footer on screen and the scroll at its maximum? */
export function pageFooterReached() {
  const s = document.querySelector('[data-wp-scroller="1"]');
  const de = document.documentElement;
  const y = s ? s.scrollTop : scrollY;
  const max = s ? s.scrollHeight - s.clientHeight : Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0) - innerHeight;
  const atEnd = y >= max - 4;
  const vis = (el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0; };
  const footers = [...document.querySelectorAll("footer,[role=contentinfo]")].filter(vis);
  const f = footers[footers.length - 1];
  if (!f) return { reached: atEnd, footer: false, reason: atEnd ? "no footer element — check the last band is the real end" : `bottom not reached (${Math.round(y)} of ${Math.round(max)}px)` };
  const r = f.getBoundingClientRect();
  const inView = r.bottom > 0 && r.top < innerHeight;
  return { reached: inView && atEnd, footer: true, reason: !atEnd ? `bottom not reached (${Math.round(y)} of ${Math.round(max)}px)` : !inView ? "footer not on screen at the end" : "" };
}
