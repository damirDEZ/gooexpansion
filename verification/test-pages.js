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
    /** Walk a page to its end as the worker does; the links it read, in order, and how it ended. */
    const walk = async (html) => {
      await page.route(`${S}/**`, (route) => route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html }));
      await page.goto(START);
      await page.unroute(`${S}/**`);
      const links = [];
      const clicked = [];
      let res = null;
      for (let i = 0; i < 40; i++) {
        const opts = { first: i === 0, reset: i === 0, stepMs: 60, settleMs: 400, clickWaitMs: 900 };
        res = await page.evaluate(`(${listingStep.toString()})(${JSON.stringify(opts)})`);
        links.push(...res.links.map((u) => new URL(u).pathname));
        if (res.clicked) clicked.push(res.clicked);
        if (res.exhausted) break;
      }
      const more = await page.evaluate(() => window.__more);
      return { links: [...new Set(links)], clicked, next: res && res.next ? new URL(res.next).pathname + new URL(res.next).search : "", exhausted: !!(res && res.exhausted), more };
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
    await browser.close();
  }

  console.log("");
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`  ${pass} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})();
