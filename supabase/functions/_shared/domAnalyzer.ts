/**
 * DOM Analyzer for the Enterprise XPath Generator.
 *
 * Streams 50k+ line Appium / web DOM dumps into a compact, classified element
 * catalog so the AI never has to consume the raw XML. All locator strings are
 * generated deterministically here — the AI's only job is ranking + reasoning.
 */

export type Platform = "android" | "ios" | "web";

export type ElementType =
  | "button"
  | "input"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "link"
  | "text"
  | "image"
  | "table"
  | "list"
  | "nav"
  | "dialog"
  | "tab"
  | "card"
  | "form"
  | "container"
  | "accessibility"
  | "unknown";

export interface DomNode {
  id: number;
  tag: string;
  attrs: Record<string, string>;
  text?: string;
  parent: number | null;
  depth: number;
  siblingIndex: number;
  screen: string;
  type: ElementType;
  // Cached for locator gen
  ancestors: number[];
}

export interface LocatorSet {
  primary_xpath: string;
  alternative_xpath: string | null;
  dynamic_xpath: string | null;
  absolute_xpath: string;
  css: string | null;
  accessibility_id: string | null;
  android: {
    uiautomator: string | null;
    resource_id: string | null;
    content_desc: string | null;
  } | null;
  ios: {
    predicate: string | null;
    class_chain: string | null;
    accessibility_identifier: string | null;
  } | null;
}

export interface HierarchyInfo {
  parent: { id: number; tag: string; name: string } | null;
  siblings: { id: number; tag: string; name: string; element_type: ElementType }[];
  children: { id: number; tag: string; name: string; element_type: ElementType }[];
}

export interface ElementAnalysis {
  id: number;
  screen: string;
  element_name: string;
  element_type: ElementType;
  tag: string;
  attributes_summary: string;
  attributes: Record<string, string>;
  hierarchy: HierarchyInfo;
  locators: LocatorSet;
  confidence: number; // 0-100
  stability: "high" | "medium" | "low";
  reasoning: string;
}

export interface DomRisk {
  kind:
    | "duplicate_id"
    | "dynamic_id"
    | "missing_accessibility"
    | "weak_selector"
    | "index_only";
  message: string;
  count?: number;
  examples?: string[];
}

export interface AnalysisCatalog {
  platform: Platform;
  totalNodes: number;
  screens: string[];
  nodes: DomNode[];
  risks: DomRisk[];
}

// ---------------------------------------------------------------------------
// Parser — tolerant SAX-style walker. Handles Appium XML and basic HTML.
// ---------------------------------------------------------------------------

const TAG_RE = /<\s*\/?\s*([a-zA-Z_][\w.:-]*)([^>]*?)\/?\s*>/g;
const ATTR_RE = /([\w.:-]+)\s*=\s*"([^"]*)"/g;

const SCREEN_TAGS_ANDROID = new Set([
  "android.widget.FrameLayout",
  "android.widget.LinearLayout",
  "androidx.compose.ui.platform.ComposeView",
]);
const SCREEN_HINTS = ["activity", "screen", "fragment", "page", "viewcontroller", "scene"];

export function parseDom(dom: string, platform: Platform): DomNode[] {
  const nodes: DomNode[] = [];
  const stack: { id: number; tag: string; childIdx: number }[] = [];
  let currentScreen = "Main";

  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let lastIndex = 0;

  while ((m = TAG_RE.exec(dom)) !== null) {
    const raw = m[0];
    const tag = m[1];
    const rest = m[2] || "";
    const isClose = raw.startsWith("</");
    const isSelf = raw.endsWith("/>") || /^(br|img|input|hr|meta|link)$/i.test(tag);

    // Text content between previous tag and this one — attach to top of stack
    if (stack.length > 0 && lastIndex < m.index) {
      const txt = dom.slice(lastIndex, m.index).trim();
      if (txt && nodes[stack[stack.length - 1].id]) {
        const cur = nodes[stack[stack.length - 1].id];
        if (!cur.text) cur.text = txt.slice(0, 200);
      }
    }
    lastIndex = m.index + raw.length;

    if (isClose) {
      while (stack.length > 0) {
        const top = stack.pop()!;
        if (top.tag === tag) break;
      }
      continue;
    }

    const attrs: Record<string, string> = {};
    ATTR_RE.lastIndex = 0;
    let am: RegExpExecArray | null;
    while ((am = ATTR_RE.exec(rest)) !== null) {
      attrs[am[1].toLowerCase()] = am[2];
    }

    // Detect screen container
    const lower = tag.toLowerCase();
    if (
      SCREEN_HINTS.some((h) => lower.includes(h)) ||
      (platform === "android" && SCREEN_TAGS_ANDROID.has(tag) && stack.length <= 2)
    ) {
      const name =
        attrs["name"] ||
        attrs["label"] ||
        attrs["resource-id"]?.split("/").pop() ||
        attrs["id"] ||
        tag.split(".").pop() ||
        tag;
      if (name) currentScreen = sanitizeScreen(name);
    }

    const parent = stack.length > 0 ? stack[stack.length - 1] : null;
    const id = nodes.length;
    const siblingIndex = parent ? ++parent.childIdx : 0;
    const ancestors = parent ? [...(nodes[parent.id].ancestors || []), parent.id] : [];

    const node: DomNode = {
      id,
      tag,
      attrs,
      text: undefined,
      parent: parent ? parent.id : null,
      depth: stack.length,
      siblingIndex,
      screen: currentScreen,
      type: classifyNode(tag, attrs, platform),
      ancestors,
    };
    nodes.push(node);

    if (!isSelf) stack.push({ id, tag, childIdx: 0 });
  }

  return nodes;
}

function sanitizeScreen(name: string): string {
  return name.replace(/[_:./-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "Main";
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export function classifyNode(
  tag: string,
  attrs: Record<string, string>,
  platform: Platform,
): ElementType {
  const t = tag.toLowerCase();
  const cls = (attrs["class"] || "").toLowerCase();
  const role = (attrs["role"] || "").toLowerCase();
  const type = (attrs["type"] || "").toLowerCase();

  if (platform === "android") {
    if (t.endsWith("button") || t.includes("imagebutton")) return "button";
    if (t.endsWith("edittext") || t.includes("autocomplete")) return "input";
    if (t.includes("checkbox")) return "checkbox";
    if (t.includes("radiobutton")) return "radio";
    if (t.includes("spinner")) return "dropdown";
    if (t.endsWith("textview")) return "text";
    if (t.includes("imageview")) return "image";
    if (t.includes("recyclerview") || t.includes("listview")) return "list";
    if (t.includes("tablayout")) return "tab";
    if (t.includes("dialog") || t.includes("alert")) return "dialog";
    if (t.endsWith("layout") || t.endsWith("viewgroup")) return "container";
  } else if (platform === "ios") {
    if (t.includes("button")) return "button";
    if (t.includes("textfield") || t.includes("securetextfield")) return "input";
    if (t.includes("switch")) return "checkbox";
    if (t.includes("picker")) return "dropdown";
    if (t.includes("statictext") || t.includes("staticText")) return "text";
    if (t.includes("image")) return "image";
    if (t.includes("table")) return "table";
    if (t.includes("collectionview")) return "list";
    if (t.includes("tabbar")) return "tab";
    if (t.includes("alert") || t.includes("sheet")) return "dialog";
    if (t.includes("navigationbar")) return "nav";
  } else {
    if (t === "button" || role === "button" || cls.includes("btn")) return "button";
    if (t === "input") {
      if (["checkbox"].includes(type)) return "checkbox";
      if (["radio"].includes(type)) return "radio";
      return "input";
    }
    if (t === "select") return "dropdown";
    if (t === "textarea") return "input";
    if (t === "a" || role === "link") return "link";
    if (t === "img") return "image";
    if (t === "nav") return "nav";
    if (t === "table") return "table";
    if (t === "ul" || t === "ol") return "list";
    if (t === "dialog" || role === "dialog") return "dialog";
    if (t === "form") return "form";
    if (cls.includes("card")) return "card";
    if (cls.includes("tab")) return "tab";
    if (t === "p" || /^h[1-6]$/.test(t) || t === "span") return "text";
    if (t === "div" || t === "section") return "container";
  }

  if (attrs["aria-label"] || attrs["content-desc"] || attrs["accessibilityidentifier"]) {
    return "accessibility";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Element naming + attribute summary
// ---------------------------------------------------------------------------

function nameFor(node: DomNode): string {
  const a = node.attrs;
  const candidates = [
    a["content-desc"],
    a["aria-label"],
    a["label"],
    a["name"],
    a["text"],
    a["value"],
    a["title"],
    node.text,
    a["resource-id"]?.split("/").pop(),
    a["id"],
    a["data-testid"],
  ].filter((v): v is string => !!v && v.trim().length > 0);
  const raw = candidates[0] || `${node.tag} #${node.id}`;
  return raw.trim().slice(0, 60);
}

function attrSummary(node: DomNode): string {
  const keep = [
    "resource-id",
    "content-desc",
    "text",
    "name",
    "label",
    "value",
    "id",
    "data-testid",
    "aria-label",
    "type",
    "class",
  ];
  return keep
    .map((k) => (node.attrs[k] ? `${k}="${truncate(node.attrs[k], 40)}"` : null))
    .filter(Boolean)
    .join(" ");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// ---------------------------------------------------------------------------
// Locator generation (deterministic)
// ---------------------------------------------------------------------------

const DYNAMIC_RE = /(?:[0-9a-f]{8,}|\d{4,}|uuid|hash|token|session)/i;

function isDynamic(v: string | undefined): boolean {
  return !!v && DYNAMIC_RE.test(v);
}

function escapeXPath(s: string): string {
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  return "concat('" + s.split("'").join("',\"'\",'") + "')";
}

export function buildLocators(node: DomNode, platform: Platform, nodes: DomNode[]): LocatorSet {
  const a = node.attrs;
  const tag = node.tag;
  let primary: string;
  let alt: string | null = null;
  let dyn: string | null = null;
  let css: string | null = null;
  const accessibility_id = a["accessibilityidentifier"] || a["data-testid"] || a["aria-label"] || null;

  // Platform-specific primary
  if (platform === "android") {
    if (a["resource-id"] && !isDynamic(a["resource-id"])) {
      primary = `//*[@resource-id=${escapeXPath(a["resource-id"])}]`;
    } else if (a["content-desc"]) {
      primary = `//*[@content-desc=${escapeXPath(a["content-desc"])}]`;
    } else if (a["text"]) {
      primary = `//${tag}[@text=${escapeXPath(a["text"])}]`;
    } else {
      primary = relativeStructural(node, nodes);
    }
    if (a["text"] && primary.indexOf("@text") < 0) {
      alt = `//${tag}[@text=${escapeXPath(a["text"])}]`;
    } else if (a["content-desc"] && primary.indexOf("@content-desc") < 0) {
      alt = `//*[@content-desc=${escapeXPath(a["content-desc"])}]`;
    }
    if (a["resource-id"]) {
      const idPart = a["resource-id"].split("/").pop() || a["resource-id"];
      dyn = `//*[contains(@resource-id, ${escapeXPath(idPart)})]`;
    } else if (a["text"]) {
      dyn = `//*[contains(@text, ${escapeXPath(a["text"].slice(0, 12))})]`;
    }
  } else if (platform === "ios") {
    if (a["name"]) primary = `//${tag}[@name=${escapeXPath(a["name"])}]`;
    else if (a["label"]) primary = `//${tag}[@label=${escapeXPath(a["label"])}]`;
    else if (a["value"]) primary = `//${tag}[@value=${escapeXPath(a["value"])}]`;
    else primary = relativeStructural(node, nodes);
    if (a["label"] && primary.indexOf("@label") < 0) alt = `//${tag}[@label=${escapeXPath(a["label"])}]`;
    else if (a["value"] && primary.indexOf("@value") < 0) alt = `//${tag}[@value=${escapeXPath(a["value"])}]`;
    if (a["name"]) dyn = `//${tag}[contains(@name, ${escapeXPath(a["name"].slice(0, 12))})]`;
  } else {
    if (a["data-testid"]) {
      primary = `//*[@data-testid=${escapeXPath(a["data-testid"])}]`;
      css = `[data-testid="${a["data-testid"]}"]`;
    } else if (a["id"] && !isDynamic(a["id"])) {
      primary = `//*[@id=${escapeXPath(a["id"])}]`;
      css = `#${a["id"]}`;
    } else if (a["aria-label"]) {
      primary = `//*[@aria-label=${escapeXPath(a["aria-label"])}]`;
      css = `[aria-label="${a["aria-label"]}"]`;
    } else if (node.text) {
      primary = `//${tag}[normalize-space()=${escapeXPath(node.text)}]`;
    } else {
      primary = relativeStructural(node, nodes);
    }
    if (a["class"]) {
      const firstCls = a["class"].split(/\s+/)[0];
      alt = `//${tag}[contains(@class, ${escapeXPath(firstCls)})]`;
    }
  }

  const absolute = absoluteXPath(node, nodes);

  const android = platform === "android" ? {
    uiautomator: a["resource-id"]
      ? `new UiSelector().resourceId("${a["resource-id"]}")`
      : a["text"]
      ? `new UiSelector().text("${a["text"]}")`
      : a["content-desc"]
      ? `new UiSelector().description("${a["content-desc"]}")`
      : null,
    resource_id: a["resource-id"] || null,
    content_desc: a["content-desc"] || null,
  } : null;

  const ios = platform === "ios" ? {
    predicate: a["name"]
      ? `name == "${a["name"]}"`
      : a["label"]
      ? `label == "${a["label"]}"`
      : null,
    class_chain: a["name"]
      ? `**/${tag}[\`name == "${a["name"]}"\`]`
      : a["label"]
      ? `**/${tag}[\`label == "${a["label"]}"\`]`
      : null,
    accessibility_identifier: a["accessibilityidentifier"] || a["name"] || null,
  } : null;

  return {
    primary_xpath: primary,
    alternative_xpath: alt,
    dynamic_xpath: dyn,
    absolute_xpath: absolute,
    css,
    accessibility_id,
    android,
    ios,
  };
}

function relativeStructural(node: DomNode, nodes: DomNode[]): string {
  // Walk up to nearest ancestor with a usable attribute, then chain by tag.
  for (let i = node.ancestors.length - 1; i >= 0; i--) {
    const anc = nodes[node.ancestors[i]];
    if (!anc) continue;
    const a = anc.attrs;
    const anchor =
      (a["resource-id"] && `@resource-id=${escapeXPath(a["resource-id"])}`) ||
      (a["name"] && `@name=${escapeXPath(a["name"])}`) ||
      (a["data-testid"] && `@data-testid=${escapeXPath(a["data-testid"])}`) ||
      (a["id"] && !isDynamic(a["id"]) && `@id=${escapeXPath(a["id"])}`) ||
      null;
    if (anchor) {
      return `//*[${anchor}]//${node.tag}[${node.siblingIndex + 1}]`;
    }
  }
  return `//${node.tag}[${node.siblingIndex + 1}]`;
}

function absoluteXPath(node: DomNode, nodes: DomNode[]): string {
  const parts: string[] = [];
  let cur: DomNode | null = node;
  while (cur) {
    parts.unshift(`${cur.tag}[${cur.siblingIndex + 1}]`);
    cur = cur.parent !== null ? nodes[cur.parent] : null;
  }
  return "/" + parts.join("/");
}

// ---------------------------------------------------------------------------
// Scoring + risks
// ---------------------------------------------------------------------------

export function scoreElement(
  node: DomNode,
  locators: LocatorSet,
  idCounts: Map<string, number>,
  uniqueness: number,
): { confidence: number; stability: "high" | "medium" | "low"; reasoning: string } {
  const a = node.attrs;
  const reasons: string[] = [];

  // Confidence = Uniqueness (0-40) + Accessibility (0-25) + Resource-ID stability (0-25) + DOM validation (0-10)
  let uniquenessScore = 10;
  if (uniqueness === 1) { uniquenessScore = 40; reasons.push("primary locator matches exactly 1 element"); }
  else if (uniqueness === 2) { uniquenessScore = 22; reasons.push(`primary locator matches ${uniqueness} elements — needs disambiguation`); }
  else if (uniqueness > 2 && uniqueness <= 5) { uniquenessScore = 12; reasons.push(`primary locator matches ${uniqueness} elements`); }
  else if (uniqueness > 5) { uniquenessScore = 4; reasons.push(`primary locator matches ${uniqueness} elements — too broad`); }

  let accessibility = 0;
  if (a["accessibilityidentifier"] || a["data-testid"]) { accessibility = 25; reasons.push("dedicated test identifier"); }
  else if (a["content-desc"] || a["aria-label"]) { accessibility = 20; reasons.push("accessibility label present"); }
  else if (a["name"] && !isDynamic(a["name"])) { accessibility = 15; reasons.push("stable name attribute"); }
  else if (a["label"]) { accessibility = 10; reasons.push("label attribute present"); }
  else { reasons.push("no accessibility identifier"); }

  let ridScore = 0;
  const rid = a["resource-id"] || a["id"];
  if (rid) {
    const dup = idCounts.get(rid) || 1;
    if (!isDynamic(rid) && dup === 1) { ridScore = 25; reasons.push("unique stable resource-id"); }
    else if (!isDynamic(rid) && dup <= 3) { ridScore = 15; reasons.push(`resource-id reused ${dup}×`); }
    else if (isDynamic(rid)) { ridScore = 5; reasons.push("resource-id looks dynamic"); }
    else { ridScore = 8; }
  }

  let validation = 8;
  if (/\[\d+\]/.test(locators.primary_xpath) && !rid && !a["text"] && !a["name"]) {
    validation = 2; reasons.push("falls back to positional index");
  } else if (locators.primary_xpath.startsWith("//*[@")) {
    validation = 10;
  }

  const score = Math.max(5, Math.min(100, uniquenessScore + accessibility + ridScore + validation));
  const stability: "high" | "medium" | "low" = score >= 80 ? "high" : score >= 55 ? "medium" : "low";
  return { confidence: score, stability, reasoning: reasons.join("; ") };
}

/** Replay the primary locator's exact attribute predicate against the catalog
 *  to compute deterministic uniqueness (how many nodes the locator matches). */
export function validateLocatorUniqueness(node: DomNode, locator: LocatorSet, nodes: DomNode[]): number {
  const a = node.attrs;
  const p = locator.primary_xpath;
  const rid = a["resource-id"];
  if (rid && p.includes("@resource-id=")) return nodes.filter((n) => n.attrs["resource-id"] === rid).length;
  if (a["content-desc"] && p.includes("@content-desc=")) return nodes.filter((n) => n.attrs["content-desc"] === a["content-desc"]).length;
  if (a["name"] && p.includes("@name=")) return nodes.filter((n) => n.tag === node.tag && n.attrs["name"] === a["name"]).length;
  if (a["label"] && p.includes("@label=")) return nodes.filter((n) => n.tag === node.tag && n.attrs["label"] === a["label"]).length;
  if (a["text"] && p.includes("@text=")) return nodes.filter((n) => n.tag === node.tag && n.attrs["text"] === a["text"]).length;
  if (a["data-testid"] && p.includes("@data-testid=")) return nodes.filter((n) => n.attrs["data-testid"] === a["data-testid"]).length;
  if (a["id"] && p.includes("@id=")) return nodes.filter((n) => n.attrs["id"] === a["id"]).length;
  return 1;
}

export function analyzeRisks(nodes: DomNode[]): DomRisk[] {
  const risks: DomRisk[] = [];

  const idCounts = new Map<string, number>();
  for (const n of nodes) {
    const rid = n.attrs["resource-id"] || n.attrs["id"];
    if (rid) idCounts.set(rid, (idCounts.get(rid) || 0) + 1);
  }
  const dup = Array.from(idCounts.entries()).filter(([, c]) => c > 1);
  if (dup.length > 0) {
    risks.push({
      kind: "duplicate_id",
      message: `${dup.length} id(s) appear on multiple elements — primary XPaths may match more than one node.`,
      count: dup.length,
      examples: dup.slice(0, 5).map(([id, c]) => `${id} (×${c})`),
    });
  }

  const dynamics = nodes.filter(
    (n) => isDynamic(n.attrs["resource-id"]) || isDynamic(n.attrs["id"]),
  );
  if (dynamics.length > 0) {
    risks.push({
      kind: "dynamic_id",
      message: `${dynamics.length} element(s) use dynamic-looking identifiers (hashes/UUIDs/long numbers).`,
      count: dynamics.length,
      examples: dynamics.slice(0, 5).map((n) => n.attrs["resource-id"] || n.attrs["id"] || n.tag),
    });
  }

  const interactive = nodes.filter((n) =>
    ["button", "input", "link", "checkbox", "radio", "dropdown"].includes(n.type),
  );
  const missingA11y = interactive.filter(
    (n) =>
      !n.attrs["content-desc"] &&
      !n.attrs["aria-label"] &&
      !n.attrs["accessibilityidentifier"] &&
      !n.attrs["label"] &&
      !n.attrs["name"],
  );
  if (missingA11y.length > 0) {
    risks.push({
      kind: "missing_accessibility",
      message: `${missingA11y.length} interactive element(s) have no accessibility label.`,
      count: missingA11y.length,
      examples: missingA11y.slice(0, 5).map((n) => nameFor(n)),
    });
  }

  return risks;
}

export function buildIdCounts(nodes: DomNode[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const n of nodes) {
    const rid = n.attrs["resource-id"] || n.attrs["id"];
    if (rid) m.set(rid, (m.get(rid) || 0) + 1);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Query matching — pick candidates from a large catalog without sending it all
// ---------------------------------------------------------------------------

const TYPE_HINTS: { rx: RegExp; types: ElementType[] }[] = [
  { rx: /\bbutton|btn|cta|submit\b/i, types: ["button"] },
  { rx: /\binput|field|textbox|email|password|search|enter\b/i, types: ["input"] },
  { rx: /\bdropdown|picker|select|spinner\b/i, types: ["dropdown"] },
  { rx: /\bcheckbox|toggle|switch\b/i, types: ["checkbox"] },
  { rx: /\bradio\b/i, types: ["radio"] },
  { rx: /\blink|anchor|hyperlink\b/i, types: ["link"] },
  { rx: /\btab\b/i, types: ["tab"] },
  { rx: /\bdialog|modal|popup|alert\b/i, types: ["dialog"] },
  { rx: /\btable|grid\b/i, types: ["table"] },
  { rx: /\blist|menu|nav\b/i, types: ["list", "nav"] },
];

export interface QueryFilter {
  text: string;
  types: ElementType[] | null;
  wantsAll: boolean;
  screenHint: string | null;
}

export function parseQuery(query: string): QueryFilter {
  const lower = query.toLowerCase();
  const types = new Set<ElementType>();
  for (const h of TYPE_HINTS) if (h.rx.test(lower)) h.types.forEach((t) => types.add(t));
  const wantsAll = /\b(all|every|list (of )?elements|entire|whole screen)\b/.test(lower);
  const screenMatch = lower.match(/\b(?:on|in|for)\s+(?:the\s+)?(\w+)\s+(?:screen|page|module)/);
  return {
    text: lower,
    types: types.size > 0 ? Array.from(types) : null,
    wantsAll,
    screenHint: screenMatch ? screenMatch[1] : null,
  };
}

export function selectCandidates(
  nodes: DomNode[],
  filter: QueryFilter,
  limit = 12,
): DomNode[] {
  const tokens = filter.text
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["the", "and", "for", "all", "give", "generate", "create", "show", "with", "from", "xpath", "xpaths", "locator", "locators", "element", "elements", "find", "get"].includes(t));

  type Scored = { node: DomNode; score: number };
  const scored: Scored[] = [];

  for (const n of nodes) {
    let s = 0;
    if (filter.types && filter.types.includes(n.type)) s += 30;
    if (filter.screenHint && n.screen.toLowerCase().includes(filter.screenHint)) s += 15;
    const hay = [
      n.attrs["text"],
      n.attrs["content-desc"],
      n.attrs["aria-label"],
      n.attrs["label"],
      n.attrs["name"],
      n.attrs["value"],
      n.attrs["resource-id"],
      n.attrs["id"],
      n.attrs["data-testid"],
      n.attrs["accessibilityidentifier"],
      n.text,
      n.tag,
      n.screen,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    for (const tok of tokens) {
      if (hay.includes(tok)) s += 14;
    }
    // Mild preference for interactive elements when query has no explicit type
    if (!filter.types && ["button", "input", "link", "checkbox", "radio", "dropdown"].includes(n.type)) s += 6;
    // Slight boost for elements with strong identifiers (more useful results)
    if (n.attrs["resource-id"] || n.attrs["accessibilityidentifier"] || n.attrs["data-testid"]) s += 3;
    if (s > 0) scored.push({ node: n, score: s });
  }

  scored.sort((a, b) => b.score - a.score);

  if (filter.wantsAll) {
    return scored.slice(0, limit * 4).map((s) => s.node);
  }
  // Broad recall: also include closely-related variants (e.g. Login → button + label + container + header)
  return scored.slice(0, Math.max(limit, 10)).map((s) => s.node);
}

// ---------------------------------------------------------------------------
// Full pipeline helper
// ---------------------------------------------------------------------------

export function analyzeCatalog(dom: string, platform: Platform): AnalysisCatalog {
  const nodes = parseDom(dom, platform);
  const screens = Array.from(new Set(nodes.map((n) => n.screen)));
  const risks = analyzeRisks(nodes);
  return { platform, totalNodes: nodes.length, screens, nodes, risks };
}

function buildHierarchy(node: DomNode, nodes: DomNode[]): HierarchyInfo {
  const parentNode = node.parent !== null ? nodes[node.parent] : null;
  const parent = parentNode
    ? { id: parentNode.id, tag: parentNode.tag, name: nameFor(parentNode) }
    : null;

  const siblings = parentNode
    ? nodes
        .filter((n) => n.parent === parentNode.id && n.id !== node.id)
        .slice(0, 8)
        .map((n) => ({ id: n.id, tag: n.tag, name: nameFor(n), element_type: n.type }))
    : [];

  const children = nodes
    .filter((n) => n.parent === node.id)
    .slice(0, 12)
    .map((n) => ({ id: n.id, tag: n.tag, name: nameFor(n), element_type: n.type }));

  return { parent, siblings, children };
}

export function buildElementAnalyses(
  catalog: AnalysisCatalog,
  candidates: DomNode[],
): ElementAnalysis[] {
  const idCounts = buildIdCounts(catalog.nodes);
  return candidates.map((node) => {
    const locators = buildLocators(node, catalog.platform, catalog.nodes);
    const score = scoreElement(node, locators, idCounts);
    return {
      id: node.id,
      screen: node.screen,
      element_name: nameFor(node),
      element_type: node.type,
      tag: node.tag,
      attributes_summary: attrSummary(node),
      attributes: { ...node.attrs },
      hierarchy: buildHierarchy(node, catalog.nodes),
      locators,
      ...score,
    };
  });
}
