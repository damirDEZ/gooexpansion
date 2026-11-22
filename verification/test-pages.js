/**
 * "Collect this page" on a listing that pages, with shelves of
 * recommendations under it: the walk goes on to the next page and leaves the
 * shelves alone.
 *
 * What the admin saw on Farfetch (2026-11-22): no endless scroll, a "Next"
 * at the bottom of the grid, and under it "Recently viewed" and "Recommended
 * for you" with a "Show more" of their own. The walk pressed that "Show more",
 * took the recommended pieces for the category's, and never went to page two.
 *
 * `listingStep` runs in Chromium, called step after step the way the worker
 * calls it (background.js, `walkListing`), on three pages written small:
 *
 *   A. Farfetch: the next page is a link, the shelves are below it;
 *   B. a listing that pages itself: "Next page" is a button, page two
 *      replaces the grid in place;
 *   C. what must keep working: a grid whose own "Show more" comes before its
 *      pages (it fills this page, the pages go on from it), under a hero
 *      slider whose "›" pages nothing.
 */
const path = require("path");
const { pathToFileURL } = require("url");

let pass = 0;
const failures = [];
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  else failures.push(`${name}\n     got  ${JSON.stringify(got).slice(0, 700)}\n     want ${JSON.stringify(want).slice(0, 700)}`);
}

const S = "https://www.shop.example";
const START = `${S}/uk/shopping/men/items.aspx`;
const card = (slug, i) => `<li class="card"><a href="/uk/shopping/men/${slug}-${i}-item-${10_000_000 + i}.aspx"><img src="data:," alt="" width="160" height="200"><span>${slug} ${i}</span></a></li>`;
const css = `<style>body{margin:0;font:14px sans-serif} .card{display:block;height:320px} section{min-height:400px} footer{height:300px}</style>`;

const farfetch = `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>
<header><nav><a href="/uk/shopping/men/items.aspx">Men</a> <a href="/uk/shopping/women/items.aspx">Women</a></nav></header>
<main>
  <h1>Men's clothing</h1>
  <ul data-testid="product-card-list">${Array.from({ length: 8 }, (_, i) => card("coat", i + 1)).join("")}</ul>
  <div data-testid="pagination"><span>Page 1 of 3</span>
    <a data-testid="page-next" aria-label="Next page" href="/uk/shopping/men/items.aspx?page=2">›</a></div>
  <section data-testid="recentlyViewed"><h2>Recently viewed</h2>
    <ul class="rv">${card("viewed", 1)}${card("viewed", 2)}</ul><button type="button" class="more">Show more</button></section>
  <section class="reco"><h2>Recommended for you</h2>
    <ul class="rc">${card("liked", 1)}${card("liked", 2)}</ul><button type="button" class="more">Show more</button></section>
</main>
<footer><a href="/help">Help</a></footer>
<script>
  window.__more = 0;
  for (const b of document.querySelectorAll("button.more")) b.addEventListener("click", () => {
    window.__more++;
    const ul = b.previousElementSibling;
    ul.insertAdjacentHTML("beforeend", '<li class="card"><a href="/uk/shopping/men/more-' + window.__more + '-item-3000000' + window.__more + '.aspx">More ' + window.__more + '</a></li>');
  });
</script></body></html>`;

const inPlace = `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>
<header><nav><a href="/uk/shopping/men/items.aspx">Men</a></nav></header>
<main>
  <ul id="grid">${Array.from({ length: 6 }, (_, i) => card("shirt", i + 1)).join("")}</ul>
  <nav aria-label="Pagination"><span id="where">1 / 2</span> <button type="button" id="next" aria-label="Next page">Next</button></nav>
  <section data-testid="recommendations"><h2>You may also like</h2><ul>${card("liked", 9)}</ul><button type="button" class="more">Show more</button></section>
</main>
<footer><a href="/help">Help</a></footer>
<script>
  window.__more = 0;
  document.querySelector("button.more").addEventListener("click", () => { window.__more++; });
  document.getElementById("next").addEventListener("click", (e) => {
    const grid = document.getElementById("grid");
    grid.innerHTML = ${JSON.stringify(Array.from({ length: 6 }, (_, i) => card("shirt", i + 7)).join(""))};
    history.pushState({}, "", "?page=2");
    document.getElementById("where").textContent = "2 / 2";
    e.currentTarget.disabled = true;
  });
</script></body></html>`;

const own = `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>
<header><nav><a href="/c/jackets">Jackets</a></nav></header>
<main>
  <div class="hero-carousel"><a href="/c/new">New season</a><button type="button" aria-label="Next">›</button></div>
  <ul id="grid">${Array.from({ length: 6 }, (_, i) => card("jacket", i + 1)).join("")}</ul>
  <div id="more-wrap"><button type="button" id="more">Show more</button></div>
  <div class="pagination"><a href="/uk/shopping/men/items.aspx?page=2" rel="next">Next</a></div>
</main>
<footer><a href="/help">Help</a></footer>
<script>
  window.__more = 0;
  document.getElementById("more").addEventListener("click", () => {
    window.__more++;
    document.getElementById("grid").insertAdjacentHTML("beforeend", ${JSON.stringify(Array.from({ length: 4 }, (_, i) => card("jacket", i + 7)).join(""))});
    document.getElementById("more-wrap").innerHTML = "";
  });
</script></body></html>`;

// D. A brand's page whose "Similar designers" sits between the grid and the
// pages, with a "See more" that is a link to another listing. Classes are
// hashed, as Farfetch's are: nothing names the pages.
const brand = `${S}/uk/shopping/men/gucci/items.aspx`;
const similarFirst = `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>
<header><nav><a href="/uk/shopping/men/items.aspx">Men</a></nav></header>
<main>
  <h1>Gucci</h1>
  <ul class="ltr-1a2b">${Array.from({ length: 6 }, (_, i) => card("gucci", i + 1)).join("")}</ul>
  <div class="ltr-77"><h3>Similar designers</h3>
    <ul class="ltr-55"><li><a href="/uk/shopping/men/prada/items.aspx">Prada</a></li><li><a href="/uk/shopping/men/fendi/items.aspx">Fendi</a></li></ul>
    <a class="ltr-66" href="/uk/shopping/men/designers/items.aspx">See more</a></div>
  <div class="ltr-9z8y"><a href="/uk/shopping/men/gucci/items.aspx">1</a> <a href="/uk/shopping/men/gucci/items.aspx?page=2">2</a>
    <a class="ltr-q" aria-label="Next" href="/uk/shopping/men/gucci/items.aspx?page=2"><svg></svg></a></div>
</main>
<footer><a href="/help">Help</a></footer></body></html>`;

// E. The listing pages itself with a "Next page" button, and a slider of
// similar designers has a "Next" link to another listing's page two.
const foreignNext = `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>
<header><nav><a href="/uk/shopping/men/items.aspx">Men</a></nav></header>
<main>
  <ul id="grid">${Array.from({ length: 6 }, (_, i) => card("gucci", i + 1)).join("")}</ul>
  <div class="ltr-77"><h3>Similar designers</h3><ul><li><a href="/uk/shopping/men/prada/items.aspx">Prada</a></li></ul>
    <a class="ltr-q" aria-label="Next" href="/uk/shopping/men/prada/items.aspx?page=2">›</a></div>
  <div class="ltr-9z8y"><span id="where">1 / 2</span> <button type="button" id="next" aria-label="Next page"><svg></svg></button></div>
</main>
<footer><a href="/help">Help</a></footer>
<script>
  document.getElementById("next").addEventListener("click", (e) => {
    document.getElementById("grid").innerHTML = ${JSON.stringify(Array.from({ length: 6 }, (_, i) => card("gucci", i + 7)).join(""))};
    history.pushState({}, "", "?page=2");
    e.currentTarget.disabled = true;
  });
</script></body></html>`;

(async () => {
  const { listingStep } = await import(pathToFileURL(path.join(__dirname, "..", "extension", "listing.js")).href);
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
    const browser = await playwright.chromium.launch({
      executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    /**
     * Walk a page to its end as the worker does; the links it read, in order,
     * how it ended, and every page the tab was taken to on the way.
     */
    const walk = async (html, start = START) => {
      const served = [];
      await page.route(`${S}/**`, (route) => {
        served.push(new URL(route.request().url()).pathname);
        route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      });
      await page.goto(start);
      const links = [];
      const clicked = [];
      let res = null;
      let error = "";
      for (let i = 0; i < 40; i++) {
        const opts = { first: i === 0, reset: i === 0, stepMs: 60, settleMs: 400, clickWaitMs: 900 };
        try {
          res = await page.evaluate(`(${listingStep.toString()})(${JSON.stringify(opts)})`);
        } catch (err) {
          error = String(err.message || err).split("\n")[0];
          break;
        }
        links.push(...res.links.map((u) => new URL(u).pathname));
        if (res.clicked) clicked.push(res.clicked);
        if (res.exhausted) break;
      }
      await page.waitForTimeout(300);
      await page.unroute(`${S}/**`);
      const more = await page.evaluate(() => window.__more).catch(() => null);
      return {
        links: [...new Set(links)],
        clicked,
        next: res && res.next ? new URL(res.next).pathname + new URL(res.next).search : "",
        exhausted: !!(res && res.exhausted),
        more,
        at: new URL(page.url()).pathname,
        away: served.slice(1),
        error,
      };
    };
    const pieces = (links) => links.filter((p) => /-item-\d+\.aspx$/.test(p));

    console.log("— A. Farfetch: the next page is a link, the shelves are below it —");
    const a = await walk(farfetch);
    check("the walk reads the grid's eight pieces, and none from Recently viewed or Recommended for you", pieces(a.links), Array.from({ length: 8 }, (_, i) => `/uk/shopping/men/coat-${i + 1}-item-${10_000_001 + i}.aspx`));
    check("it never presses a shelf's \"Show more\"", [a.more, a.clicked], [0, []]);
    check("and at the end it names page two, for the worker to open", [a.exhausted, a.next], [true, "/uk/shopping/men/items.aspx?page=2"]);

    console.log("— B. a listing that pages itself with a button —");
    const b = await walk(inPlace);
    check(
      "\"Next page\" is pressed, and page two's pieces are read after page one's",
      pieces(b.links),
      Array.from({ length: 12 }, (_, i) => `/uk/shopping/men/shirt-${i + 1}-item-${10_000_001 + i}.aspx`),
    );
    check("pressed once, the shelf's \"Show more\" never, and the walk ends on the last page", [b.clicked, b.more, b.exhausted, b.next], [["Next page"], 0, true, ""]);

    console.log("— C. the grid's own \"Show more\", before its pages, under a slider —");
    const c = await walk(own);
    check("the grid's \"Show more\" is still pressed, and what it loads is read", [c.more, c.clicked, pieces(c.links).length], [1, ["Show more"], 10]);
    check("then page two, from the pages' own \"Next\"", c.next, "/uk/shopping/men/items.aspx?page=2");

    console.log("— D. a brand's page: \"Similar designers\" between the grid and its pages —");
    const d = await walk(similarFirst, brand);
    check("the tab never leaves the brand: \"See more\" to another listing is not the grid's", [d.away, d.at, d.error], [[], "/uk/shopping/men/gucci/items.aspx", ""]);
    check("the brand's six pieces are read", pieces(d.links).length, 6);
    check("and the next page is the brand's own page two", [d.exhausted, d.next], [true, "/uk/shopping/men/gucci/items.aspx?page=2"]);

    console.log("— E. a \"Next\" to another listing's page two, the brand's \"Next page\" a button —");
    const e = await walk(foreignNext, brand);
    check("the other listing's \"Next\" is not this listing's next page", [e.away, e.error, e.next], [[], "", ""]);
    check("the brand's own \"Next page\" is pressed, and its page two read", [e.clicked, pieces(e.links).length], [["Next page"], 12]);
    await browser.close();
  }

  // ── Where the walk may go ─────────────────────────────────────────────────
  console.log("— a page of the same listing, and anything else —");
  const { sameListing = () => null } = await import(pathToFileURL(path.join(__dirname, "..", "extension", "listing.js")).href);
  const L = `${S}/uk/shopping/men/gucci/items.aspx`;
  check(
    "the listing's own pages are its: a query, a page number, /page/N",
    [
      sameListing(L, `${L}?page=2`),
      sameListing(L, `${L}?view=96&page=3`),
      sameListing(`${S}/c/jackets`, `${S}/c/jackets/page/2`),
      sameListing(`${S}/c/jackets/page/2`, `${S}/c/jackets/page/3`),
      sameListing(`${S}/c/jackets/`, `${S}/c/jackets?p=2`),
      // The tab arrived with a tag its pager's links do not carry.
      sameListing(`${S}/c/jackets?srsltid=AfmBOo&utm_source=google`, `${S}/c/jackets?page=2`),
      sameListing(`${S}/shop?cat=coats&gclid=x`, `${S}/shop?page=2&cat=coats`),
    ],
    [true, true, true, true, true, true, true],
  );
  check(
    "another listing, another store, a product is not",
    [
      sameListing(L, `${S}/uk/shopping/men/prada/items.aspx?page=2`),
      sameListing(L, `${S}/uk/shopping/men/designers/items.aspx`),
      sameListing(L, `https://other.example/uk/shopping/men/gucci/items.aspx?page=2`),
      sameListing(`${S}/c/jackets`, `${S}/c/jackets-sale`),
      sameListing(`${S}/shop?cat=coats`, `${S}/shop?cat=bags&page=2`),
      sameListing(L, "not a url"),
    ],
    [false, false, false, false, false, false],
  );

  console.log("");
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})();
