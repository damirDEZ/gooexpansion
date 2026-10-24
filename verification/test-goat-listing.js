/**
 * "Collect this page" on GOAT's trending ASICS: the pieces the page shows,
 * and nothing it keeps around them.
 *
 * What the admin saw (2026-10-24): the page counted two hundred ASICS, the
 * run planned 21, imported five, and all five were Air Jordans that are not
 * on the page at all, the same ones on every GOAT page. Two causes, both
 * checked here against the shipping modules:
 *
 *   - the planner did not know GOAT's ASICS for pieces. GOAT addresses a
 *     sneaker as its name and its style code, `/sneakers/gel-1130-black-
 *     1201a256-002`; a Nike code (`dz5485-042`) read as a code, an ASICS one
 *     (`1201a256`), a New Balance one (`m990gl6`) and a Vans one
 *     (`vn000d3hy28`) did not, so the grid was thrown away whole;
 *   - the walk took every link on the page, the header's menus and the footer
 *     first, in page order. What was left of product shape was GOAT's own
 *     furniture: the release calendar's Jordans.
 *
 * The page below is that page in miniature: the Jordans in a menu, in a
 * dropdown that is not open, in a search overlay and in the footer; filters
 * in a side panel; the grid in the middle, one card a little different from
 * the others. `listingStep` runs on it in Chromium, `planHtml` hands the walk
 * to `planCollection`, and the run must come back with the grid, in its order,
 * and nothing else.
 */
const path = require("path");
const Module = require("module");
const { pathToFileURL } = require("url");

const COMPILED = path.join(__dirname, "compiled");
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(COMPILED, request.slice(2));
  return origResolve.call(this, request, ...rest);
};

const PARSER = path.join(COMPILED, "lib", "server", "parser");
const { looksLikeProductPath } = require(path.join(PARSER, "extract.js"));
const { planCollection } = require(path.join(PARSER, "plan-collection.js"));

let pass = 0;
const failures = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else failures.push(`${name}\n     got  ${JSON.stringify(got).slice(0, 600)}\n     want ${JSON.stringify(want).slice(0, 600)}`);
}

const STORE = "https://www.goat.com";
const START = `${STORE}/collections/trending-asics`;

/** The grid, in the order the page shows it. */
const GRID = [
  "/sneakers/albino-preto-x-atmos-x-gel-kayano-12-1-black-green-1203a537-001",
  "/sneakers/gel-1130-black-1201a256-002",
  "/sneakers/gel-kayano-14-black-pure-silver-1201a019-006",
  "/sneakers/gel-1130-mule-black-silver-1203a505-001",
  "/sneakers/gel-1130-cream-black-1201a255-104",
  "/sneakers/toga-x-gel-cumulus-16-tg-grey-black-pure-silver-1203a608-020",
  "/sneakers/gel-stratus-mc-concrete-carbon-1203a612-020",
  "/sneakers/gel-nyc-graphite-grey-black-1203a280-020",
  "/sneakers/990v6-made-in-usa-grey-m990gl6",
  "/sneakers/old-skool-black-white-vn000d3hy28",
];

/** GOAT's own furniture: on every page, in no grid. */
const JORDANS = {
  menu: "/sneakers/air-jordan-5-retro-halloween-dv0562-008",
  dropdown: "/sneakers/air-jordan-1-retro-high-og-royal-reimagined-dz5485-042",
  overlay: "/sneakers/pharrell-x-adidas-adistar-jellyfish-red-jr6744",
  footer: "/sneakers/air-jordan-17-low-black-pack-fz1234-001",
  component: "/sneakers/air-jordan-14-retro-forest-green-fj9371-300",
  filtered: "/sneakers/air-jordan-4-retro-bred-reimagined-fv5029-006",
};

(async () => {
  const { listingStep, planHtml } = await import(pathToFileURL(path.join(__dirname, "..", "extension", "listing.js")).href);

  // ── The planner: a name followed by its style code is a piece ─────────────
  console.log("— a sneaker's address on GOAT is its name and its style code —");
  for (const p of GRID) check(`a piece: ${p}`, looksLikeProductPath(p), true);
  for (const p of Object.values(JORDANS)) check(`still a piece: ${p}`, looksLikeProductPath(p), true);
  for (const p of [
    "/sneakers/air-jordan-1-retro-high-og-555088-101", // Flight Club, a plain digit code
    "/p/550-white-green-bb550wt1",
    "/sneakers/gel-lyte-3-og-cream-1201a582-100",
    "/gb/new-balance-m990gl6-made-in-usa-m990gl6.html", // END.: "new" is New Balance's here
    "/sneakers/9060-rain-cloud-grey-u9060gry",
    "/sneakers/574-legacy-grey-u574lgrg",
  ]) {
    check(`a piece: ${p}`, looksLikeProductPath(p), true);
  }
  // What is not a piece stays out, code or no code.
  for (const p of [
    "/collections/trending-asics",
    "/collections/gel-1130-black-1201a256", // a section addressed by its slug
    "/brand/asics",
    "/sneakers",
    "/search/gel-1130-black-1201a256-002",
    "/editorial/the-best-asics-of-2026",
    "/en/man-blazers-l608.html", // Zara's category: its code is a short one
    "/c/gifts-under-100eur",
    "/c/sale-gel-1130-1201a256",
    "/c/jackets",
    "/timeline",
    "/sneakers/gel-1130", // a model, not a piece: no code
    "/w/mens-jordan-shoes-37eefznik1zy7ok", // Nike's filters: a hash, not a code
    "/w/womens-shoes-5e1x6zy7ok",
    "/w/mens-running-shoes-37v7jznik1zy7ok",
    "/c/summer-sale-2024ss",
    "/c/new-in-shoes",
  ]) {
    check(`not a piece: ${p}`, looksLikeProductPath(p), false);
  }

  // ── The walk: the page as it shows itself ─────────────────────────────────
  const playwright = (() => {
    try {
      return require(process.env.PLAYWRIGHT_MODULE || "playwright");
    } catch {
      return null;
    }
  })();
  if (!playwright) {
    failures.push("Playwright is not installed: the walk was not checked (set NODE_PATH or PLAYWRIGHT_MODULE)");
  } else {
    console.log("— the trending ASICS page, walked —");
    const card = (href, i) =>
      i === 2
        ? // A card that is an article with a header of its own: a card's header is the card's.
          `<article class="cell"><header><a href="${href}">ASICS piece ${i}</a></header><img src="data:," alt="" width="120" height="80"></article>`
        : `<a class="cell" href="${href}"><img src="data:," alt="" width="120" height="80"><span>ASICS piece ${i}</span><span>€${70 + i}</span></a>`;
    const page = `<!doctype html><html><head><title>Trending: ASICS | GOAT</title>
<meta property="og:type" content="website">
<style>
  body { margin: 0; font: 14px sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(4, 200px); gap: 8px; }
  .cell { display: block; height: 240px; border: 1px solid #ddd; }
</style></head><body>
<header class="site-header">
  <a href="/">GOAT</a>
  <nav aria-label="Main">
    <a href="/">Home</a> <a href="/search">Shop 615,456 Items</a> <a href="/editorial">Editorial</a> <a href="/timeline">Timeline</a>
    <div class="mega"><a href="${JORDANS.menu}"><img src="data:," alt="">Air Jordan 5 Retro 'Halloween'</a></div>
    <goo-featured></goo-featured>
  </nav>
</header>
<div class="timeline-dropdown" style="display: none">
  <a href="${JORDANS.dropdown}">Air Jordan 1 Retro High OG 'Royal' 2026</a>
</div>
<div class="search-overlay" role="dialog" aria-modal="true">
  <p>Trending searches</p><a href="${JORDANS.overlay}">Pharrell x adidas Adistar Jellyfish 'Red'</a>
</div>
<aside class="filters">
  <a href="/collections/trending-asics?sort=popular">Popular</a>
  <a href="/collections/trending-asics?sort=price_high">Price (High)</a>
  <a href="/brand/asics">Brand</a>
</aside>
<main>
  <h1>Trending: ASICS</h1> <span>213 Items</span>
  <div class="grid">
    ${GRID.map(card).join("\n    ")}
    <a class="cell" style="display: none" href="${JORDANS.filtered}">Filtered out by the page's own filter</a>
  </div>
</main>
<footer>
  <h4>Trending now</h4>
  <a href="${JORDANS.footer}">Air Jordan 17 Low 'Black Pack'</a>
  <a href="/help">Help</a>
</footer>
<script>
  // A menu item drawn by a web component: its link lives in a shadow root,
  // and the menu around it in the page.
  customElements.define("goo-featured", class extends HTMLElement {
    connectedCallback() {
      this.attachShadow({ mode: "open" }).innerHTML = '<a href="${JORDANS.component}">Air Jordan 14 Retro \\'Forest Green\\'</a>';
    }
  });
</script>
</body></html>`;

    const browser = await playwright.chromium.launch({
      executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    });
    const tab = await browser.newPage();
    await tab.route(`${STORE}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: page }));
    await tab.goto(START);
    const step = (opts) => tab.evaluate(`(${listingStep.toString()})(${JSON.stringify(opts)})`);

    const look = await step({ first: true, reset: true, scroll: false });
    const shown = look.links.map((u) => new URL(u).pathname);
    const jordans = Object.values(JORDANS);
    check("the walk reads every card of the grid, in the page's order", shown.filter((p) => p.startsWith("/sneakers/")), GRID);
    for (const [where, p] of Object.entries(JORDANS)) {
      check(`and not the Jordan in the ${where}`, shown.includes(p), false);
    }
    check("nor names any of them", Object.keys(look.names).some((u) => jordans.includes(new URL(u).pathname)), false);
    check("the article's own header is the card's, not the page's", shown.includes(GRID[2]), true);
    check("a side panel's filters are not the listing either", shown.some((p) => p === "/brand/asics"), false);

    const plan = planCollection({ startUrl: START, html: planHtml([look.head], look.links), limit: 2000 });
    check("the run plans exactly the grid", plan.urls.map((u) => new URL(u).pathname), GRID);
    check("and does not take the page for one product", plan.isSingleProduct, false);

    // The dropdown opened later, as a hover opens it: the link the walk did
    // not take while it was hidden is still the menu's, not the listing's.
    await tab.evaluate(() => {
      document.querySelector(".timeline-dropdown").style.display = "block";
      document.querySelector("header").append(document.querySelector(".timeline-dropdown"));
    });
    const hovered = await step({ scroll: false });
    check("a menu opened mid-walk adds nothing", hovered.links, []);

    // The page's own filter shows a card it had hidden: now it is on the page.
    await tab.evaluate(() => {
      document.querySelector('a[style*="none"]').style.display = "";
    });
    const revealed = await step({ scroll: false });
    check(
      "a card the page shows later is read then",
      revealed.links.map((u) => new URL(u).pathname),
      [JORDANS.filtered],
    );
    await browser.close();
  }

  console.log("");
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})();
